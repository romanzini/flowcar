import { prisma } from '@/lib/prisma'
import { NotFoundError } from '@/lib/api-error'
import type { StockMovementCreateInput } from '@/lib/validations/stock-movement'

const movementSelect = {
  id: true,
  tenantId: true,
  productId: true,
  userId: true,
  serviceOrderId: true,
  type: true,
  quantity: true,
  unitCost: true,
  reason: true,
  createdAt: true,
  product: { select: { name: true, unit: true } },
  user: { select: { name: true } },
}

export async function recordMovement(
  tenantId: string,
  productId: string,
  userId: string,
  input: StockMovementCreateInput
) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } })
  if (!product) throw new NotFoundError()

  const qty = input.quantity

  const movement = await prisma.$transaction(async (tx) => {
    // Calculate new costPrice for ENTRADA using weighted average
    let newCostPrice: number = Number(product.costPrice)

    if (input.type === 'ENTRADA' && input.unitCost !== undefined) {
      const prevStock = Number(product.currentStock)
      const prevCost = Number(product.costPrice)
      const incomingQty = qty
      const incomingCost = input.unitCost

      if (prevStock <= 0) {
        newCostPrice = incomingCost
      } else {
        newCostPrice =
          (prevStock * prevCost + incomingQty * incomingCost) / (prevStock + incomingQty)
      }
    }

    // Calculate stock delta
    const delta =
      input.type === 'ENTRADA' ? qty : input.type === 'SAIDA' ? -qty : qty

    // Update product stock (and possibly costPrice)
    await tx.product.update({
      where: { id: productId },
      data: {
        currentStock: { increment: delta },
        ...(input.type === 'ENTRADA' && input.unitCost !== undefined
          ? { costPrice: newCostPrice }
          : {}),
      },
    })

    // Create immutable movement record
    return tx.stockMovement.create({
      data: {
        tenantId,
        productId,
        userId,
        serviceOrderId: input.serviceOrderId ?? null,
        type: input.type,
        quantity: qty,
        unitCost: input.unitCost ?? null,
        reason: input.reason ?? null,
      },
      select: movementSelect,
    })
  })

  return movement
}

export async function listMovements(
  tenantId: string,
  productId: string,
  filters?: { from?: string; to?: string }
) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } })
  if (!product) throw new NotFoundError()

  const movements = await prisma.stockMovement.findMany({
    where: {
      tenantId,
      productId,
      ...(filters?.from || filters?.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    },
    select: movementSelect,
    orderBy: { createdAt: 'desc' },
  })

  return movements
}
