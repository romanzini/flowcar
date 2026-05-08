import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadFile, validateMagicBytes } from '@/lib/storage/upload'
import { logFileUpload } from '@/lib/logging/logger'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'
import type { FileCategory } from '@prisma/client'

const ALLOWED_CATEGORIES: FileCategory[] = ['FOTO_VEICULO', 'FOTO_SERVICO', 'LOGOTIPO']
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const userId = req.headers.get('x-user-id') ?? undefined

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const category = formData.get('category') as string | null
    const serviceOrderId = formData.get('serviceOrderId') as string | null

    if (!file) {
      throw new UnprocessableError('Arquivo é obrigatório')
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category as FileCategory)) {
      throw new UnprocessableError(
        `Categoria inválida. Permitidas: ${ALLOWED_CATEGORIES.join(', ')}`
      )
    }

    const mimeType = file.type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new UnprocessableError(
        `Tipo de arquivo não permitido. Permitidos: JPG, PNG, WEBP`
      )
    }

    if (file.size > MAX_SIZE) {
      throw new UnprocessableError('Arquivo excede o tamanho máximo de 10 MB')
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // SEC-001: validate magic bytes before any storage operation
    if (!validateMagicBytes(buffer, mimeType)) {
      throw new UnprocessableError(
        'Tipo do arquivo não corresponde ao conteúdo (magic bytes inválidos)'
      )
    }

    const ext = MIME_EXTENSIONS[mimeType] ?? 'bin'
    const { objectKey, bucket, checksum } = await uploadFile({
      tenantId,
      category: category.toLowerCase(),
      buffer,
      mimeType,
      originalExtension: ext,
    })

    // SEC-010: log file upload after successful MinIO operation
    logFileUpload(tenantId, mimeType, file.size)

    const fileUpload = await prisma.fileUpload.create({
      data: {
        tenantId,
        category: category as FileCategory,
        bucket,
        objectKey,
        mimeType,
        sizeBytes: file.size,
        checksum,
        uploadedByUserId: userId ?? null,
        ...(serviceOrderId
          ? { serviceOrderFiles: { connect: { id: serviceOrderId } } }
          : {}),
      },
      select: {
        id: true,
        category: true,
        objectKey: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    })

    return ok(fileUpload, 201)
  })()
}
