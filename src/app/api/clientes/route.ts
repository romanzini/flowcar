import { NextRequest } from 'next/server'
import { customerCreateSchema } from '@/lib/validations/customer'
import { listCustomers, createCustomer } from '@/server/services/customer.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const search = req.nextUrl.searchParams.get('search') ?? undefined

    const customers = await listCustomers(tenantId, search)
    return ok(customers)
  })()
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = customerCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const customer = await createCustomer(tenantId, parsed.data)
    return ok(customer, 201)
  })()
}
