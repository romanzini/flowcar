import { NextRequest } from 'next/server'
import type { ContractStatus } from '@prisma/client'
import { contractCreateSchema } from '@/lib/validations/contract'
import { createContract, listContracts } from '@/server/services/contract.service'
import { ForbiddenError, UnprocessableError, withErrorHandler } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    if (req.headers.get('x-user-role') !== 'GERENTE') {
      throw new ForbiddenError('Acesso restrito a gerentes')
    }

    const tenantId = req.headers.get('x-tenant-id')!
    const status = req.nextUrl.searchParams.get('status') ?? undefined

    const contracts = await listContracts(tenantId, {
      status: status as ContractStatus | undefined,
    })

    return ok(contracts)
  })()
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  return withErrorHandler(async () => {
    if (req.headers.get('x-user-role') !== 'GERENTE') {
      throw new ForbiddenError('Acesso restrito a gerentes')
    }

    const tenantId = req.headers.get('x-tenant-id')!
    const parsed = contractCreateSchema.safeParse(body)

    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const contract = await createContract(tenantId, parsed.data)
    return ok(contract, 201)
  })()
}
