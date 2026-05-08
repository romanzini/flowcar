import { NextRequest } from 'next/server'
import { customerUpdateSchema } from '@/lib/validations/customer'
import {
  getCustomerById,
  updateCustomer,
  deactivateCustomer,
} from '@/server/services/customer.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const customer = await getCustomerById(id, tenantId)
    return ok(customer)
  })()
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = customerUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const customer = await updateCustomer(id, tenantId, parsed.data)
    return ok(customer)
  })()
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const customer = await deactivateCustomer(id, tenantId)
    return ok(customer)
  })()
}
