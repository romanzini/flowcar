import { NextRequest } from 'next/server'
import { vehicleUpdateSchema } from '@/lib/validations/vehicle'
import {
  getVehicleById,
  updateVehicle,
  deactivateVehicle,
} from '@/server/services/vehicle.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const vehicle = await getVehicleById(id, tenantId)
    return ok(vehicle)
  })()
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = vehicleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const vehicle = await updateVehicle(id, tenantId, parsed.data)
    return ok(vehicle)
  })()
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const vehicle = await deactivateVehicle(id, tenantId)
    return ok(vehicle)
  })()
}
