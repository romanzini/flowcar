import { NextRequest } from 'next/server'
import { statusTransitionSchema } from '@/lib/validations/service-order'
import { transitionStatus } from '@/server/services/service-order.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = statusTransitionSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Status inválido')
    }

    const os = await transitionStatus(id, tenantId, parsed.data.status)
    return ok(os)
  })()
}
