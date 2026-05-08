import { NextRequest } from 'next/server'
import { osCreateSchema } from '@/lib/validations/service-order'
import { listOS, createOS } from '@/server/services/service-order.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const { searchParams } = req.nextUrl

    const os = await listOS(tenantId, {
      status: searchParams.get('status') ?? undefined,
      customerId: searchParams.get('customerId') ?? undefined,
      vehicleId: searchParams.get('vehicleId') ?? undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
    })

    return ok(os)
  })()
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const userId = req.headers.get('x-user-id')!

    const parsed = osCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const os = await createOS(tenantId, userId, parsed.data)
    return ok(os, 201)
  })()
}
