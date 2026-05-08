import { prisma } from '@/lib/prisma'
import { NotFoundError, UnprocessableError } from '@/lib/api-error'
import type { VehicleCreateInput, VehicleUpdateInput } from '@/lib/validations/vehicle'

const vehicleSelect = {
  id: true,
  tenantId: true,
  customerId: true,
  plate: true,
  brand: true,
  model: true,
  year: true,
  color: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}

export async function listVehiclesByCustomer(customerId: string, tenantId: string) {
  // Verify customer belongs to tenant
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } })
  if (!customer) throw new NotFoundError()

  return prisma.vehicle.findMany({
    where: { customerId, tenantId },
    select: vehicleSelect,
    orderBy: { plate: 'asc' },
  })
}

export async function getVehicleById(id: string, tenantId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, tenantId },
    select: vehicleSelect,
  })

  if (!vehicle) throw new NotFoundError()
  return vehicle
}

export async function createVehicle(tenantId: string, input: VehicleCreateInput) {
  // Verify customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, tenantId },
  })
  if (!customer) throw new NotFoundError()

  try {
    return await prisma.vehicle.create({
      data: {
        tenantId,
        customerId: input.customerId,
        plate: input.plate,
        brand: input.brand ?? null,
        model: input.model ?? null,
        year: input.year ?? null,
        color: input.color ?? null,
      },
      select: vehicleSelect,
    })
  } catch (error) {
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2002') {
      throw new UnprocessableError('Já existe um veículo com esta placa cadastrado para este tenant')
    }
    throw error
  }
}

export async function updateVehicle(
  id: string,
  tenantId: string,
  input: VehicleUpdateInput
) {
  const existing = await prisma.vehicle.findFirst({ where: { id, tenantId } })
  if (!existing) throw new NotFoundError()

  try {
    return await prisma.vehicle.update({
      where: { id },
      data: {
        ...(input.plate !== undefined && { plate: input.plate }),
        ...(input.brand !== undefined && { brand: input.brand }),
        ...(input.model !== undefined && { model: input.model }),
        ...(input.year !== undefined && { year: input.year }),
        ...(input.color !== undefined && { color: input.color }),
      },
      select: vehicleSelect,
    })
  } catch (error) {
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2002') {
      throw new UnprocessableError('Já existe um veículo com esta placa cadastrado para este tenant')
    }
    throw error
  }
}

export async function deactivateVehicle(id: string, tenantId: string) {
  const existing = await prisma.vehicle.findFirst({ where: { id, tenantId } })
  if (!existing) throw new NotFoundError()

  // Block deactivation if active OS exist for this vehicle
  const activeOrders = await prisma.serviceOrder.findMany({
    where: {
      vehicleId: id,
      tenantId,
      status: { in: ['AGUARDANDO', 'EM_ANDAMENTO'] },
    },
    select: { id: true, number: true },
  })

  if (activeOrders.length > 0) {
    throw new UnprocessableError(
      `Não é possível desativar o veículo. OS ativas: ${activeOrders.map((o) => o.number).join(', ')}`
    )
  }

  return prisma.vehicle.update({
    where: { id },
    data: { isActive: false },
    select: vehicleSelect,
  })
}
