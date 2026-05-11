import { NextRequest } from 'next/server'
import { osUpdateSchema } from '@/lib/validations/service-order'
import { getOSById, updateOS } from '@/server/services/service-order.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const os = await getOSById(id, tenantId)
    return ok(os)
  })()
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = osUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const os = await updateOS(id, tenantId, parsed.data)
    return ok(os)
  })()
}
