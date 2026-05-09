import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { linkRegenerationSchema } from '@/lib/validations/contract'
import { generateSigningLink, regenerateLink } from '@/server/services/contract.service'
import { assertTenantOwnership } from '@/server/policies/rbac'
import { ForbiddenError, NotFoundError, UnprocessableError, withErrorHandler } from '@/lib/api-error'
import { ok } from '@/lib/utils'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  const body = await req.json().catch(() => ({}))

  return withErrorHandler(async () => {
    if (req.headers.get('x-user-role') !== 'GERENTE') {
      throw new ForbiddenError('Acesso restrito a gerentes')
    }

    const parsed = linkRegenerationSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError('Dados inválidos')
    }

    const tenantId = req.headers.get('x-tenant-id')!
    const { id } = await params

    const existing = await prisma.contract.findFirst({
      where: { id },
      select: { tenantId: true, status: true },
    })

    if (!existing) {
      throw new NotFoundError()
    }

    assertTenantOwnership(existing.tenantId, {
      userId: req.headers.get('x-user-id')!,
      tenantId,
      role: req.headers.get('x-user-role')!,
    })

    const result =
      existing.status === 'RASCUNHO'
        ? await generateSigningLink(id, tenantId)
        : await regenerateLink(id, tenantId)

    return ok(result)
  })()
}
