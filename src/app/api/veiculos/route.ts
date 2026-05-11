import { NextRequest } from 'next/server'
import { vehicleCreateSchema } from '@/lib/validations/vehicle'
import { listVehiclesByCustomer, createVehicle } from '@/server/services/vehicle.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const customerId = req.nextUrl.searchParams.get('customerId')

    if (!customerId) {
      throw new UnprocessableError('customerId é obrigatório')
    }

    const vehicles = await listVehiclesByCustomer(customerId, tenantId)
    return ok(vehicles)
  })()
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = vehicleCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const vehicle = await createVehicle(tenantId, parsed.data)
    return ok(vehicle, 201)
  })()
}
