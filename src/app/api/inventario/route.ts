import { NextRequest } from 'next/server'
import { productCreateSchema } from '@/lib/validations/product'
import { listProducts, createProduct } from '@/server/services/product.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const lowStock = req.nextUrl.searchParams.get('lowStock') === 'true'

    const products = await listProducts(tenantId, lowStock)
    return ok(products)
  })()
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = productCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const product = await createProduct(tenantId, parsed.data)
    return ok(product, 201)
  })()
}
