import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { renderContractHTML } from '@/lib/pdf/contract-template'
import { generatePDF } from '@/lib/pdf/generator'
import { getContractById } from '@/server/services/contract.service'
import { getFileBuffer, uploadFile } from '@/lib/storage/upload'
import { assertTenantOwnership } from '@/server/policies/rbac'
import { ApiError, ForbiddenError, UnprocessableError } from '@/lib/api-error'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    if (req.headers.get('x-user-role') !== 'GERENTE') {
      throw new ForbiddenError('Acesso restrito a gerentes')
    }

    const tenantId = req.headers.get('x-tenant-id')!
    const userId = req.headers.get('x-user-id') ?? undefined
    const { id } = await params

    const existing = await prisma.contract.findFirst({
      where: { id },
      select: { tenantId: true },
    })

    if (existing) {
      assertTenantOwnership(existing.tenantId, {
        userId: req.headers.get('x-user-id')!,
        tenantId,
        role: req.headers.get('x-user-role')!,
      })
    }

    const contract = await getContractById(id, tenantId)

    if (contract.status !== 'ASSINADO' || !contract.signature) {
      throw new UnprocessableError('Apenas contratos assinados podem gerar PDF')
    }

    if (contract.pdfFile?.objectKey) {
      const pdfBuffer = await getFileBuffer(contract.pdfFile.objectKey)
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="contrato-${contract.number}.pdf"`,
          'Content-Length': String(pdfBuffer.length),
        },
      })
    }

    const signatureBuffer = await getFileBuffer(contract.signature.signatureFile.objectKey)
    const signatureDataUrl = `data:${contract.signature.signatureFile.mimeType};base64,${signatureBuffer.toString('base64')}`

    const html = renderContractHTML(
      {
        number: contract.number,
        title: contract.title,
        contentHtml: contract.contentHtml,
      },
      contract.customer,
      {
        signedAt: contract.signature.signedAt,
        signedIp: contract.signature.signedIp,
        signatureDataUrl,
      }
    )

    const pdfBuffer = await generatePDF(html)
    const uploadResult = await uploadFile({
      tenantId,
      category: 'PDF_CONTRATO',
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      originalExtension: 'pdf',
    })

    const fileUpload = await prisma.fileUpload.create({
      data: {
        tenantId,
        category: 'PDF_CONTRATO',
        bucket: uploadResult.bucket,
        objectKey: uploadResult.objectKey,
        mimeType: 'application/pdf',
        sizeBytes: pdfBuffer.length,
        checksum: uploadResult.checksum,
        uploadedByUserId: userId ?? null,
      },
      select: { id: true },
    })

    await prisma.contract.update({
      where: { id },
      data: { pdfFileId: fileUpload.id },
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contrato-${contract.number}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('[pdf/contract]', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
