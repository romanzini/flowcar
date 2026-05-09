import { prisma } from '@/lib/prisma'

interface ReportFilter {
  tenantId: string
  from: Date
  to: Date
}

export interface RevenueReportRow {
  date: string
  revenue: number
  ordersCount: number
}

export interface TopServicesRow {
  serviceTypeName: string
  count: number
  revenue: number
}

export interface TopCustomersRow {
  customerId: string
  customerName: string
  ordersCount: number
  totalSpent: number
}

export interface StockMovementsRow {
  date: string
  productId: string
  productName: string
  type: string
  quantity: number
  unitCost: number
}

export async function getRevenueReport(filter: ReportFilter): Promise<RevenueReportRow[]> {
  const { tenantId, from, to } = filter

  const orders = await prisma.serviceOrder.findMany({
    where: {
      tenantId,
      status: 'CONCLUIDO',
      completedAt: { gte: from, lte: to },
    },
    select: { completedAt: true, totalAmount: true },
    orderBy: { completedAt: 'asc' },
  })

  const byDay = new Map<string, { revenue: number; ordersCount: number }>()
  for (const o of orders) {
    const date = (o.completedAt ?? new Date()).toISOString().slice(0, 10)
    const existing = byDay.get(date) ?? { revenue: 0, ordersCount: 0 }
    existing.revenue += Number(o.totalAmount)
    existing.ordersCount += 1
    byDay.set(date, existing)
  }

  return Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    revenue: v.revenue,
    ordersCount: v.ordersCount,
  }))
}

export async function getTopServices(filter: ReportFilter): Promise<TopServicesRow[]> {
  const { tenantId, from, to } = filter

  const items = await prisma.serviceOrderItem.findMany({
    where: {
      kind: 'SERVICO',
      serviceOrder: {
        tenantId,
        status: 'CONCLUIDO',
        completedAt: { gte: from, lte: to },
      },
    },
    select: {
      description: true,
      subtotal: true,
      serviceType: { select: { name: true } },
    },
  })

  const byService = new Map<string, { count: number; revenue: number }>()
  for (const item of items) {
    const name = item.serviceType?.name ?? item.description
    const existing = byService.get(name) ?? { count: 0, revenue: 0 }
    existing.count += 1
    existing.revenue += Number(item.subtotal)
    byService.set(name, existing)
  }

  return Array.from(byService.entries())
    .map(([serviceTypeName, v]) => ({
      serviceTypeName,
      count: v.count,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)
}

export async function getTopCustomers(filter: ReportFilter): Promise<TopCustomersRow[]> {
  const { tenantId, from, to } = filter

  const orders = await prisma.serviceOrder.findMany({
    where: {
      tenantId,
      status: 'CONCLUIDO',
      completedAt: { gte: from, lte: to },
    },
    select: {
      totalAmount: true,
      customer: { select: { id: true, name: true } },
    },
  })

  const byCustomer = new Map<string, { name: string; ordersCount: number; totalSpent: number }>()
  for (const o of orders) {
    const { id, name } = o.customer
    const existing = byCustomer.get(id) ?? { name, ordersCount: 0, totalSpent: 0 }
    existing.ordersCount += 1
    existing.totalSpent += Number(o.totalAmount)
    byCustomer.set(id, existing)
  }

  return Array.from(byCustomer.entries())
    .map(([customerId, v]) => ({
      customerId,
      customerName: v.name,
      ordersCount: v.ordersCount,
      totalSpent: v.totalSpent,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 20)
}

export async function getStockMovementsReport(filter: ReportFilter): Promise<StockMovementsRow[]> {
  const { tenantId, from, to } = filter

  const movements = await prisma.stockMovement.findMany({
    where: {
      tenantId,
      createdAt: { gte: from, lte: to },
    },
    select: {
      createdAt: true,
      type: true,
      quantity: true,
      unitCost: true,
      product: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return movements.map((m) => ({
    date: m.createdAt.toISOString().slice(0, 10),
    productId: m.product.id,
    productName: m.product.name,
    type: m.type,
    quantity: Number(m.quantity),
    unitCost: Number(m.unitCost ?? 0),
  }))
}
