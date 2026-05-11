import { prisma } from '@/lib/prisma'
import { generateSequentialNumber } from '@/lib/utils'
import { NotFoundError, UnprocessableError } from '@/lib/api-error'
import {
  insertQueueEntry,
  promoteToInProgress,
  removeFromQueue,
  resequencePositions,
} from './queue.service'
import { enqueueNotification } from './whatsapp.service'
import type { OSCreateInput, OSUpdateInput, OSItemInput } from '@/lib/validations/service-order'

const osSelect = {
  id: true,
  tenantId: true,
  customerId: true,
  vehicleId: true,
  responsibleUserId: true,
  number: true,
  status: true,
  subtotalAmount: true,
  discountAmount: true,
  totalAmount: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  sourceQuoteId: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true, phone: true } },
  vehicle: { select: { id: true, plate: true, brand: true, model: true } },
  responsibleUser: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      kind: true,
      serviceTypeId: true,
      productId: true,
      description: true,
      quantity: true,
      unitPrice: true,
      discountAmount: true,
      subtotal: true,
      createdAt: true,
    },
  },
  queueEntry: {
    select: {
      id: true,
      status: true,
      position: true,
      estimatedMinutes: true,
      enteredAt: true,
      startedAt: true,
    },
  },
  fileUploads: {
    select: {
      id: true,
      category: true,
      objectKey: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
  },
}

function recalcTotals(items: { unitPrice: unknown; quantity: unknown; discountAmount: unknown }[]) {
  let subtotal = 0
  let totalDiscount = 0
  for (const item of items) {
    const unitPrice = Number(item.unitPrice)
    const quantity = Number(item.quantity)
    const discount = Number(item.discountAmount)
    const gross = unitPrice * quantity
    subtotal += gross
    totalDiscount += discount
  }
  return { subtotal, totalDiscount, total: subtotal - totalDiscount }
}

export async function createOS(tenantId: string, userId: string, input: OSCreateInput) {
  // Block if vehicle already has an active OS
  const activeOS = await prisma.serviceOrder.findFirst({
    where: {
      vehicleId: input.vehicleId,
      tenantId,
      status: { in: ['AGUARDANDO', 'EM_ANDAMENTO'] },
    },
    select: { number: true },
  })

  if (activeOS) {
    throw new UnprocessableError(
      `Veículo já possui ordem de serviço ativa: ${activeOS.number}`
    )
  }

  // Verify customer and vehicle belong to tenant
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, tenantId },
    select: { id: true, customerId: true },
  })
  if (!vehicle) throw new NotFoundError('Veículo não encontrado')

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, tenantId },
    select: { id: true },
  })
  if (!customer) throw new NotFoundError('Cliente não encontrado')

  const number = await generateSequentialNumber(tenantId, 'OS', 'serviceOrder')

  const serviceOrder = await prisma.serviceOrder.create({
    data: {
      tenantId,
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      responsibleUserId: input.responsibleUserId ?? userId,
      number,
      status: 'AGUARDANDO',
      sourceQuoteId: input.sourceQuoteId ?? null,
    },
    select: osSelect,
  })

  await insertQueueEntry(tenantId, serviceOrder.id)

  return prisma.serviceOrder.findFirstOrThrow({
    where: { id: serviceOrder.id },
    select: osSelect,
  })
}

export async function transitionStatus(
  id: string,
  tenantId: string,
  targetStatus: 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO'
) {
  const os = await prisma.serviceOrder.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true, number: true, customerId: true },
  })
  if (!os) throw new NotFoundError()

  const validTransitions: Record<string, string[]> = {
    AGUARDANDO: ['EM_ANDAMENTO', 'CANCELADO'],
    EM_ANDAMENTO: ['CONCLUIDO', 'CANCELADO'],
    CONCLUIDO: [],
    CANCELADO: [],
  }

  if (!validTransitions[os.status]?.includes(targetStatus)) {
    throw new UnprocessableError(
      `Transição inválida: ${os.status} → ${targetStatus}`
    )
  }

  const now = new Date()
  const updateData: Record<string, unknown> = { status: targetStatus }

  if (targetStatus === 'EM_ANDAMENTO') {
    updateData.startedAt = now
    await promoteToInProgress(id)
  } else if (targetStatus === 'CONCLUIDO') {
    updateData.completedAt = now
    const tenantId_ = await removeFromQueue(id)
    if (tenantId_) await resequencePositions(tenantId_)
    void enqueueNotification(tenantId, os.customerId, id, 'OS_CONCLUIDA').catch(() => {})
  } else if (targetStatus === 'CANCELADO') {
    updateData.cancelledAt = now
    const tenantId_ = await removeFromQueue(id)
    if (tenantId_) await resequencePositions(tenantId_)
    void enqueueNotification(tenantId, os.customerId, id, 'OS_CANCELADA').catch(() => {})
  }

  return prisma.serviceOrder.update({
    where: { id },
    data: updateData,
    select: osSelect,
  })
}

export async function addItem(serviceOrderId: string, tenantId: string, input: OSItemInput) {
  const os = await prisma.serviceOrder.findFirst({
    where: { id: serviceOrderId, tenantId },
    select: { id: true, status: true },
  })
  if (!os) throw new NotFoundError()

  if (os.status === 'CONCLUIDO' || os.status === 'CANCELADO') {
    throw new UnprocessableError('Não é possível adicionar itens a uma OS concluída ou cancelada')
  }

  const gross = input.quantity * input.unitPrice
  const subtotal = gross - (input.discountAmount ?? 0)

  await prisma.serviceOrderItem.create({
    data: {
      serviceOrderId,
      kind: input.kind,
      serviceTypeId: input.serviceTypeId ?? null,
      productId: input.productId ?? null,
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      discountAmount: input.discountAmount ?? 0,
      subtotal,
    },
  })

  // Recalculate totals
  const allItems = await prisma.serviceOrderItem.findMany({
    where: { serviceOrderId },
    select: { unitPrice: true, quantity: true, discountAmount: true },
  })

  const { subtotal: newSubtotal, totalDiscount, total } = recalcTotals(allItems)

  return prisma.serviceOrder.update({
    where: { id: serviceOrderId },
    data: {
      subtotalAmount: newSubtotal,
      discountAmount: totalDiscount,
      totalAmount: total,
    },
    select: osSelect,
  })
}

export async function removeItem(itemId: string, serviceOrderId: string, tenantId: string) {
  const os = await prisma.serviceOrder.findFirst({
    where: { id: serviceOrderId, tenantId },
    select: { id: true, status: true },
  })
  if (!os) throw new NotFoundError()

  if (os.status === 'CONCLUIDO' || os.status === 'CANCELADO') {
    throw new UnprocessableError('Não é possível remover itens de uma OS concluída ou cancelada')
  }

  const item = await prisma.serviceOrderItem.findFirst({
    where: { id: itemId, serviceOrderId },
    select: { id: true },
  })
  if (!item) throw new NotFoundError('Item não encontrado')

  await prisma.serviceOrderItem.delete({ where: { id: itemId } })

  const allItems = await prisma.serviceOrderItem.findMany({
    where: { serviceOrderId },
    select: { unitPrice: true, quantity: true, discountAmount: true },
  })

  const { subtotal: newSubtotal, totalDiscount, total } = recalcTotals(allItems)

  return prisma.serviceOrder.update({
    where: { id: serviceOrderId },
    data: {
      subtotalAmount: newSubtotal,
      discountAmount: totalDiscount,
      totalAmount: total,
    },
    select: osSelect,
  })
}

export async function getOSById(id: string, tenantId: string) {
  const os = await prisma.serviceOrder.findFirst({
    where: { id, tenantId },
    select: osSelect,
  })
  if (!os) throw new NotFoundError()
  return os
}

export interface ListOSFilters {
  status?: string
  customerId?: string
  vehicleId?: string
  dateFrom?: string
  dateTo?: string
}

export async function listOS(tenantId: string, filters: ListOSFilters = {}) {
  return prisma.serviceOrder.findMany({
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
            },
          }
        : {}),
    },
    select: osSelect,
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateOS(id: string, tenantId: string, input: OSUpdateInput) {
  const os = await prisma.serviceOrder.findFirst({ where: { id, tenantId }, select: { id: true } })
  if (!os) throw new NotFoundError()

  return prisma.serviceOrder.update({
    where: { id },
    data: {
      ...(input.responsibleUserId !== undefined && {
        responsibleUserId: input.responsibleUserId,
      }),
    },
    select: osSelect,
  })
}
