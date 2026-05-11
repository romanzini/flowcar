import { createHash, randomBytes } from 'crypto'
import type { ContractStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiError, NotFoundError, UnprocessableError } from '@/lib/api-error'
import { generateSequentialNumber, withSequentialNumberRetry } from '@/lib/utils'
import { logContractSigned } from '@/lib/logging/logger'
import type {
  ContractCreateInput,
  ContractUpdateInput,
} from '@/lib/validations/contract'

const contractSelect = {
  id: true,
  tenantId: true,
  customerId: true,
  number: true,
  title: true,
  contentHtml: true,
  status: true,
  publicLinkExpiresAt: true,
  signedAt: true,
  pdfFileId: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
    },
  },
  signature: {
    select: {
      id: true,
      signatureFileId: true,
      signedIp: true,
      signedUserAgent: true,
      signedAt: true,
      createdAt: true,
      signatureFile: {
        select: {
          id: true,
          objectKey: true,
          mimeType: true,
          bucket: true,
        },
      },
    },
  },
  pdfFile: {
    select: {
      id: true,
      objectKey: true,
      mimeType: true,
      bucket: true,
    },
  },
} as const

const publicContractSelect = {
  id: true,
  tenantId: true,
  number: true,
  title: true,
  contentHtml: true,
  status: true,
  publicLinkExpiresAt: true,
  customer: {
    select: {
      id: true,
      name: true,
    },
  },
} as const

function hashPublicToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function buildPublicUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${appUrl}/contratos/assinar/${token}`
}

async function persistSigningLink(id: string, tenantId: string) {
  const token = randomBytes(32).toString('hex')
  const publicTokenHash = hashPublicToken(token)
  const publicLinkExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.contract.update({
    where: { id },
    data: {
      tenantId,
      publicTokenHash,
      publicLinkExpiresAt,
      status: 'AGUARDANDO_ASSINATURA',
    },
  })

  return { publicUrl: buildPublicUrl(token) }
}

async function ensureCustomerExists(customerId: string, tenantId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true },
  })

  if (!customer) {
    throw new NotFoundError('Cliente não encontrado')
  }
}

export async function createContract(tenantId: string, input: ContractCreateInput) {
  await ensureCustomerExists(input.customerId, tenantId)

  return withSequentialNumberRetry(() =>
    prisma.$transaction(async (tx) => {
      const number = await generateSequentialNumber(tenantId, 'CTR', 'contract', tx)

      return tx.contract.create({
        data: {
          tenantId,
          customerId: input.customerId,
          number,
          title: input.title,
          contentHtml: input.contentHtml,
          status: 'RASCUNHO',
        },
        select: contractSelect,
      })
    })
  )
}

export async function generateSigningLink(id: string, tenantId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true },
  })

  if (!contract) {
    throw new NotFoundError()
  }

  if (!['RASCUNHO', 'AGUARDANDO_ASSINATURA'].includes(contract.status)) {
    throw new UnprocessableError('Não é possível gerar link para este contrato')
  }

  return persistSigningLink(id, tenantId)
}

export async function regenerateLink(id: string, tenantId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true },
  })

  if (!contract) {
    throw new NotFoundError()
  }

  if (contract.status !== 'AGUARDANDO_ASSINATURA') {
    throw new UnprocessableError('Apenas contratos aguardando assinatura podem gerar novo link')
  }

  return persistSigningLink(id, tenantId)
}

export async function signContract(
  token: string,
  signatureFileId: string,
  signedIp: string,
  signedUserAgent?: string
) {
  const publicTokenHash = hashPublicToken(token)
  const now = new Date()

  const contract = await prisma.contract.findFirst({
    where: { publicTokenHash },
    select: {
      id: true,
      tenantId: true,
      status: true,
      publicLinkExpiresAt: true,
    },
  })

  if (!contract || contract.status !== 'AGUARDANDO_ASSINATURA') {
    throw new UnprocessableError('Link de assinatura inválido ou expirado')
  }

  if (!contract.publicLinkExpiresAt || contract.publicLinkExpiresAt <= now) {
    throw new UnprocessableError('Link de assinatura expirado')
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.contract.findUnique({
      where: { id: contract.id },
      select: {
        id: true,
        status: true,
        publicTokenHash: true,
        publicLinkExpiresAt: true,
      },
    })

    if (!current) {
      throw new NotFoundError()
    }

    if (current.status === 'ASSINADO') {
      throw new ApiError('Contrato já assinado', 409)
    }

    if (
      current.status !== 'AGUARDANDO_ASSINATURA' ||
      current.publicTokenHash !== publicTokenHash ||
      !current.publicLinkExpiresAt ||
      current.publicLinkExpiresAt <= now
    ) {
      throw new UnprocessableError('Link de assinatura inválido ou expirado')
    }

    try {
      await tx.contractSignature.create({
        data: {
          contractId: contract.id,
          signatureFileId,
          signedIp,
          signedUserAgent: signedUserAgent ?? null,
          signedAt: now,
        },
      })
    } catch (error) {
      const prismaError = error as { code?: string }
      if (prismaError.code === 'P2002') {
        throw new ApiError('Contrato já assinado', 409)
      }
      throw error
    }

    await tx.contract.update({
      where: { id: contract.id },
      data: {
        status: 'ASSINADO',
        signedAt: now,
        publicTokenHash: null,
        publicLinkExpiresAt: null,
      },
    })
  })

  logContractSigned(contract.id, contract.tenantId, signedIp)

  return getContractById(contract.id, contract.tenantId)
}

export async function getContractById(id: string, tenantId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id, tenantId },
    select: contractSelect,
  })

  if (!contract) {
    throw new NotFoundError()
  }

  return contract
}

export async function listContracts(
  tenantId: string,
  filters: { status?: ContractStatus } = {}
) {
  return prisma.contract.findMany({
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status } : {}),
    },
    select: contractSelect,
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateContract(id: string, tenantId: string, input: ContractUpdateInput) {
  const contract = await prisma.contract.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true },
  })

  if (!contract) {
    throw new NotFoundError()
  }

  if (contract.status !== 'RASCUNHO') {
    throw new UnprocessableError('Apenas contratos em RASCUNHO podem ser editados')
  }

  if (input.customerId !== undefined) {
    await ensureCustomerExists(input.customerId, tenantId)
  }

  return prisma.contract.update({
    where: { id },
    data: {
      ...(input.customerId !== undefined && { customerId: input.customerId }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.contentHtml !== undefined && { contentHtml: input.contentHtml }),
    },
    select: contractSelect,
  })
}

export async function getContractByToken(token: string) {
  const publicTokenHash = hashPublicToken(token)
  const now = new Date()

  return prisma.contract.findFirst({
    where: {
      publicTokenHash,
      status: 'AGUARDANDO_ASSINATURA',
      publicLinkExpiresAt: { gt: now },
    },
    select: publicContractSelect,
  })
}
