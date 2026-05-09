import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { contractUpdateSchema } from '@/lib/validations/contract'
import { getContractById, updateContract } from '@/server/services/contract.service'
import { assertTenantOwnership } from '@/server/policies/rbac'
import { ForbiddenError, UnprocessableError, withErrorHandler } from '@/lib/api-error'
import { ok } from '@/lib/utils'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    if (req.headers.get('x-user-role') !== 'GERENTE') {
      throw new ForbiddenError('Acesso restrito a gerentes')
    }

    const tenantId = req.headers.get('x-tenant-id')!
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
    return ok(contract)
  })()
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json()

  return withErrorHandler(async () => {
    if (req.headers.get('x-user-role') !== 'GERENTE') {
      throw new ForbiddenError('Acesso restrito a gerentes')
    }

    const tenantId = req.headers.get('x-tenant-id')!
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

    const parsed = contractUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const contract = await updateContract(id, tenantId, parsed.data)
    return ok(contract)
  })()
}
