import { NextRequest } from 'next/server'
import { serviceTypeCreateSchema } from '@/lib/validations/settings'
import { listServiceTypes, createServiceType } from '@/server/services/settings.service'
import { ForbiddenError, UnprocessableError, withErrorHandler } from '@/lib/api-error'
import { ok } from '@/lib/utils'

// GET is accessible without role restriction (used by OS/Quote forms, public queue)
export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'

    const serviceTypes = await listServiceTypes(tenantId, includeInactive)
    return ok(serviceTypes)
  })()
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  return withErrorHandler(async () => {
    if (req.headers.get('x-user-role') !== 'GERENTE') {
      throw new ForbiddenError('Acesso restrito a gerentes')
    }

    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = serviceTypeCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const serviceType = await createServiceType(tenantId, parsed.data)
    return ok(serviceType, 201)
  })()
}
