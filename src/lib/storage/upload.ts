import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { s3, S3_BUCKET } from './s3'

// ─── Allowed MIME types and their magic bytes ─────────────────────────────────
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF…WEBP — checked below
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export type AllowedMimeType = keyof typeof MAGIC_BYTES

// SEC-001: validate file type via magic bytes
export function validateMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
  const patterns = MAGIC_BYTES[declaredMimeType]
  if (!patterns) return false

  for (const pattern of patterns) {
    const matches = pattern.every((byte, i) => buffer[i] === byte)
    if (matches) {
      // Extra check for WEBP: bytes 8–11 must be 0x57 45 42 50 ("WEBP")
      if (declaredMimeType === 'image/webp') {
        const webpSignature = [0x57, 0x45, 0x42, 0x50]
        return webpSignature.every((byte, i) => buffer[8 + i] === byte)
      }
      return true
    }
  }
  return false
}

export interface UploadOptions {
  tenantId: string
  category: string
  buffer: Buffer
  mimeType: string
  originalExtension: string
}

export interface UploadResult {
  objectKey: string
  bucket: string
  checksum: string
}

export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { tenantId, category, buffer, mimeType, originalExtension } = options

  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_SIZE_BYTES / 1024 / 1024} MB`)
  }

  // SEC-001: validate magic bytes before any storage operation
  if (!validateMagicBytes(buffer, mimeType)) {
    throw new Error(`File type validation failed: magic bytes do not match declared MIME type ${mimeType}`)
  }

  const uuid = randomUUID()
  const ext = originalExtension.replace(/^\./, '')
  const objectKey = `${tenantId}/${category}/${uuid}.${ext}`

  const { createHash } = await import('crypto')
  const checksum = createHash('sha256').update(buffer).digest('hex')

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType,
      Metadata: { checksum },
    })
  )

  return { objectKey, bucket: S3_BUCKET, checksum }
}

export async function getPresignedUrl(objectKey: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: objectKey }),
    { expiresIn: expiresInSeconds }
  )
}
