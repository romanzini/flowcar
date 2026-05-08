import { NextRequest } from 'next/server'
import { osItemSchema } from '@/lib/validations/service-order'
import { addItem, removeItem } from '@/server/services/service-order.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = osItemSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const os = await addItem(id, tenantId, parsed.data)
    return ok(os, 201)
  })()
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!
    const itemId = req.nextUrl.searchParams.get('itemId')

    if (!itemId) {
      throw new UnprocessableError('itemId é obrigatório')
    }

    const os = await removeItem(itemId, id, tenantId)
    return ok(os)
  })()
}
