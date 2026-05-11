import { prisma } from '@/lib/prisma'
import { NotFoundError, UnprocessableError } from '@/lib/api-error'
import { uploadFile, validateMagicBytes } from '@/lib/storage/upload'
import { logFileUpload } from '@/lib/logging/logger'
import type { CarWashConfigUpdateInput, ServiceTypeCreateInput, ServiceTypeUpdateInput } from '@/lib/validations/settings'

// ─── CarWashConfig ────────────────────────────────────────────────────────────

export async function getConfig(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      businessName: true,
      slug: true,
      config: {
        select: {
          id: true,
          simultaneousSlots: true,
          phone: true,
          address: true,
          logoFileId: true,
          updatedAt: true,
        },
      },
    },
  })
  if (!tenant) throw new NotFoundError()
  return tenant
}

export async function upsertConfig(tenantId: string, input: CarWashConfigUpdateInput) {
  // Update Tenant.slug with uniqueness guard
  const tenantUpdate: Record<string, unknown> = {}
  if (input.businessName !== undefined) tenantUpdate.businessName = input.businessName
  if (input.slug !== undefined) {
    const existing = await prisma.tenant.findUnique({ where: { slug: input.slug } })
    if (existing && existing.id !== tenantId) {
      throw new UnprocessableError('Slug já está em uso por outro lava-jato')
    }
    tenantUpdate.slug = input.slug
  }

  if (Object.keys(tenantUpdate).length > 0) {
    await prisma.tenant.update({ where: { id: tenantId }, data: tenantUpdate })
  }

  const configData: Record<string, unknown> = {}
  if (input.simultaneousSlots !== undefined) configData.simultaneousSlots = input.simultaneousSlots
  if (input.phone !== undefined) configData.phone = input.phone
  if (input.address !== undefined) configData.address = input.address
  if (input.logoFileId !== undefined) configData.logoFileId = input.logoFileId

  const config = await prisma.carWashConfig.upsert({
    where: { tenantId },
    create: { tenantId, ...configData },
    update: configData,
    select: {
      id: true,
      tenantId: true,
      simultaneousSlots: true,
      phone: true,
      address: true,
      logoFileId: true,
      updatedAt: true,
    },
  })

  return config
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function uploadLogo(tenantId: string, userId: string | undefined, file: File) {
  const mimeType = file.type
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new UnprocessableError('Tipo de arquivo não permitido. Use JPG, PNG ou WEBP')
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new UnprocessableError('Arquivo excede o tamanho máximo de 10 MB')
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (!validateMagicBytes(buffer, mimeType)) {
    throw new UnprocessableError(
      'Tipo do arquivo não corresponde ao conteúdo (magic bytes inválidos)'
    )
  }

  const ext = MIME_EXTENSIONS[mimeType] ?? 'jpg'
  const { objectKey, bucket, checksum } = await uploadFile({
    tenantId,
    category: 'logotipo',
    buffer,
    mimeType,
    originalExtension: ext,
  })

  logFileUpload(tenantId, mimeType, file.size)

  const fileUpload = await prisma.fileUpload.create({
    data: {
      tenantId,
      category: 'LOGOTIPO',
      bucket,
      objectKey,
      mimeType,
      sizeBytes: file.size,
      checksum,
      uploadedByUserId: userId ?? null,
    },
    select: { id: true, objectKey: true, mimeType: true },
  })

  // Update CarWashConfig logo
  await prisma.carWashConfig.upsert({
    where: { tenantId },
    create: { tenantId, logoFileId: fileUpload.id },
    update: { logoFileId: fileUpload.id },
  })

  return fileUpload
}

// ─── ServiceType ──────────────────────────────────────────────────────────────

const serviceTypeSelect = {
  id: true,
  tenantId: true,
  name: true,
  basePrice: true,
  estimatedMinutes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}

export async function listServiceTypes(tenantId: string, includeInactive = false) {
  return prisma.serviceType.findMany({
    where: { tenantId, ...(includeInactive ? {} : { isActive: true }) },
    select: serviceTypeSelect,
    orderBy: { name: 'asc' },
  })
}

export async function createServiceType(tenantId: string, input: ServiceTypeCreateInput) {
  return prisma.serviceType.create({
    data: {
      tenantId,
      name: input.name,
      basePrice: input.basePrice,
      estimatedMinutes: input.estimatedMinutes,
    },
    select: serviceTypeSelect,
  })
}

export async function updateServiceType(
  id: string,
  tenantId: string,
  input: ServiceTypeUpdateInput
) {
  const existing = await prisma.serviceType.findFirst({ where: { id, tenantId } })
  if (!existing) throw new NotFoundError()

  return prisma.serviceType.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
      ...(input.estimatedMinutes !== undefined && { estimatedMinutes: input.estimatedMinutes }),
    },
    select: serviceTypeSelect,
  })
}

export async function deactivateServiceType(id: string, tenantId: string) {
  const existing = await prisma.serviceType.findFirst({ where: { id, tenantId } })
  if (!existing) throw new NotFoundError()

  // Block deactivation if referenced in active OS or quotes
  const activeUsage = await prisma.serviceOrderItem.findFirst({
    where: {
      serviceTypeId: id,
      serviceOrder: { tenantId, status: { in: ['AGUARDANDO', 'EM_ANDAMENTO'] } },
    },
    select: { serviceOrder: { select: { number: true } } },
  })

  if (activeUsage) {
    throw new UnprocessableError(
      `Não é possível desativar o tipo de serviço. Referenciado na OS: ${activeUsage.serviceOrder.number}`
    )
  }

  return prisma.serviceType.update({
    where: { id },
    data: { isActive: false },
    select: serviceTypeSelect,
  })
}
