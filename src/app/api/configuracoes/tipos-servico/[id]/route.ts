import { NextRequest } from 'next/server'
import { serviceTypeUpdateSchema } from '@/lib/validations/settings'
import { updateServiceType, deactivateServiceType } from '@/server/services/settings.service'
import { ForbiddenError, UnprocessableError, withErrorHandler } from '@/lib/api-error'
import { ok } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json()

  return withErrorHandler(async () => {
    if (req.headers.get('x-user-role') !== 'GERENTE') {
      throw new ForbiddenError('Acesso restrito a gerentes')
    }

    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = serviceTypeUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const serviceType = await updateServiceType(id, tenantId, parsed.data)
    return ok(serviceType)
  })()
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    if (req.headers.get('x-user-role') !== 'GERENTE') {
      throw new ForbiddenError('Acesso restrito a gerentes')
    }

    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const serviceType = await deactivateServiceType(id, tenantId)
    return ok(serviceType)
  })()
}
