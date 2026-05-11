import { NextRequest } from 'next/server'
import { productUpdateSchema } from '@/lib/validations/product'
import {
  getProductById,
  updateProduct,
  deactivateProduct,
} from '@/server/services/product.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const product = await getProductById(id, tenantId)
    return ok(product)
  })()
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = productUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const product = await updateProduct(id, tenantId, parsed.data)
    return ok(product)
  })()
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const product = await deactivateProduct(id, tenantId)
    return ok(product)
  })()
}
