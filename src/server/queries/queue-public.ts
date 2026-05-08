import { prisma } from '@/lib/prisma'
import { maskPlate } from '@/lib/utils'

export interface PublicQueueItem {
  orderNumber: string
  maskedPlate: string
  status: 'AGUARDANDO' | 'EM_ANDAMENTO'
  position: number | null
  estimatedMinutes: number | null
}

export interface PublicQueueData {
  tenantName: string
  slug: string
  simultaneousSlots: number
  inService: PublicQueueItem[]
  waiting: PublicQueueItem[]
  updatedAt: string
}

function calcOsEstimatedMinutes(
  items: Array<{ serviceType: { estimatedMinutes: number } | null; quantity: number }>
): number {
  return items.reduce((sum, item) => {
    if (!item.serviceType) return sum
    return sum + item.serviceType.estimatedMinutes * item.quantity
  }, 0)
}

export async function getPublicQueue(slug: string): Promise<PublicQueueData | null> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug },
    select: {
      id: true,
      businessName: true,
      slug: true,
      config: {
        select: { simultaneousSlots: true },
      },
    },
  })

  if (!tenant) return null

  const simultaneousSlots = tenant.config?.simultaneousSlots ?? 1

  const entries = await prisma.queueEntry.findMany({
    where: {
      tenantId: tenant.id,
      status: { in: ['AGUARDANDO', 'EM_ANDAMENTO'] },
    },
    orderBy: [{ status: 'asc' }, { position: 'asc' }, { enteredAt: 'asc' }],
    select: {
      id: true,
      status: true,
      position: true,
      estimatedMinutes: true,
      serviceOrder: {
        select: {
          number: true,
          vehicle: { select: { plate: true } },
          items: {
            select: {
              quantity: true,
              serviceType: { select: { estimatedMinutes: true } },
            },
          },
        },
      },
    },
  })

  // Resolve per-OS service duration (from stored field or computed from items)
  const entriesWithDuration = entries.map((entry) => {
    const storedMinutes = entry.estimatedMinutes
    const computed = entry.serviceOrder
      ? calcOsEstimatedMinutes(
          entry.serviceOrder.items.map((i) => ({
            serviceType: i.serviceType,
            quantity: Number(i.quantity),
          }))
        )
      : 0
    return {
      ...entry,
      serviceDuration: storedMinutes ?? (computed > 0 ? computed : null),
    }
  })

  const waiting = entriesWithDuration
    .filter((e) => e.status === 'AGUARDANDO')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  const inService = entriesWithDuration.filter((e) => e.status === 'EM_ANDAMENTO')

  // Cumulative wait time per AGUARDANDO position
  let cumulativeMinutes = 0
  const waitingItems: PublicQueueItem[] = waiting.map((entry, idx) => {
    const waitMinutes =
      idx === 0 ? 0 : Math.ceil(cumulativeMinutes / simultaneousSlots)
    cumulativeMinutes += entry.serviceDuration ?? 0
    return {
      orderNumber: entry.serviceOrder?.number ?? '',
      maskedPlate: maskPlate(entry.serviceOrder?.vehicle?.plate ?? ''),
      status: 'AGUARDANDO',
      position: idx + 1,
      estimatedMinutes: waitMinutes > 0 ? waitMinutes : null,
    }
  })

  const inServiceItems: PublicQueueItem[] = inService.map((entry) => ({
    orderNumber: entry.serviceOrder?.number ?? '',
    maskedPlate: maskPlate(entry.serviceOrder?.vehicle?.plate ?? ''),
    status: 'EM_ANDAMENTO',
    position: null,
    estimatedMinutes: null,
  }))

  return {
    tenantName: tenant.businessName,
    slug: tenant.slug,
    simultaneousSlots,
    inService: inServiceItems,
    waiting: waitingItems,
    updatedAt: new Date().toISOString(),
  }
}
