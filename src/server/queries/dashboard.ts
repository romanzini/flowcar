import { prisma } from '@/lib/prisma'

export interface DashboardKPIs {
  dayRevenue: number
  openOrdersCount: number
  monthCompletedCount: number
  criticalStockCount: number
}

export async function getDayRevenue(tenantId: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const result = await prisma.serviceOrder.aggregate({
    where: {
      tenantId,
      status: 'CONCLUIDO',
      completedAt: { gte: today, lt: tomorrow },
    },
    _sum: { totalAmount: true },
  })

  return Number(result._sum.totalAmount ?? 0)
}

export async function getOpenOrdersCount(tenantId: string): Promise<number> {
  return prisma.serviceOrder.count({
    where: {
      tenantId,
      status: { in: ['AGUARDANDO', 'EM_ANDAMENTO'] },
    },
  })
}

export async function getMonthCompletedCount(tenantId: string): Promise<number> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  return prisma.serviceOrder.count({
    where: {
      tenantId,
      status: 'CONCLUIDO',
      completedAt: { gte: startOfMonth },
    },
  })
}

export async function getCriticalStockCount(tenantId: string): Promise<number> {
  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    select: { currentStock: true, minimumStock: true },
  })

  return products.filter(
    (p) => Number(p.currentStock) <= Number(p.minimumStock)
  ).length
}

export async function getDashboardKPIs(tenantId: string): Promise<DashboardKPIs> {
  const [dayRevenue, openOrdersCount, monthCompletedCount, criticalStockCount] = await Promise.all([
    getDayRevenue(tenantId),
    getOpenOrdersCount(tenantId),
    getMonthCompletedCount(tenantId),
    getCriticalStockCount(tenantId),
  ])

  return { dayRevenue, openOrdersCount, monthCompletedCount, criticalStockCount }
}
