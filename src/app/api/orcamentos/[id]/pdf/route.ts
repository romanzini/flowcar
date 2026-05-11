import { NextRequest, NextResponse } from 'next/server'
import { getQuoteById } from '@/server/services/quote.service'
import { renderQuoteHTML } from '@/lib/pdf/quote-template'
import { generatePDF } from '@/lib/pdf/generator'
import { uploadFile } from '@/lib/storage/upload'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/api-error'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id')!
    const userId = req.headers.get('x-user-id') ?? undefined
    const { id } = await params

    const quote = await getQuoteById(id, tenantId)

    const html = renderQuoteHTML(
      {
        number: quote.number,
        validUntil: quote.validUntil,
        totalAmount: String(quote.totalAmount),
        status: quote.status,
      },
      quote.items.map((item) => ({
        ...item,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        discountAmount: String(item.discountAmount),
        subtotal: String(item.subtotal),
      })),
      quote.customer,
      quote.vehicle ?? undefined
    )

    const pdfBuffer = await generatePDF(html)

    const uploadResult = await uploadFile({
      tenantId,
      category: 'PDF_ORCAMENTO',
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      originalExtension: '.pdf',
    })

    // Persist FileUpload record and link to quote
    const fileUpload = await prisma.fileUpload.create({
      data: {
        tenantId,
        category: 'PDF_ORCAMENTO',
        bucket: uploadResult.bucket,
        objectKey: uploadResult.objectKey,
        mimeType: 'application/pdf',
        sizeBytes: pdfBuffer.length,
        checksum: uploadResult.checksum,
        uploadedByUserId: userId ?? null,
      },
    })

    await prisma.quote.update({
      where: { id },
      data: { pdfFileId: fileUpload.id },
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="orcamento-${quote.number}.pdf"`,
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
    console.error('[pdf/quote]', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
