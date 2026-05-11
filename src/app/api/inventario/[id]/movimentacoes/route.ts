import { NextRequest } from 'next/server'
import { stockMovementCreateSchema } from '@/lib/validations/stock-movement'
import { recordMovement, listMovements } from '@/server/services/stock.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id: productId } = await params
    const tenantId = req.headers.get('x-tenant-id')!
    const from = req.nextUrl.searchParams.get('from') ?? undefined
    const to = req.nextUrl.searchParams.get('to') ?? undefined

    const movements = await listMovements(tenantId, productId, { from, to })
    return ok(movements)
  })()
}

export async function POST(req: NextRequest, { params }: Params) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const { id: productId } = await params
    const tenantId = req.headers.get('x-tenant-id')!
    const userId = req.headers.get('x-user-id')!

    const parsed = stockMovementCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const movement = await recordMovement(tenantId, productId, userId, parsed.data)
    return ok(movement, 201)
  })()
}
