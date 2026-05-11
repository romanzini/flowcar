import { prisma } from '@/lib/prisma'

export interface InternalQueueEntry {
  id: string
  serviceOrderId: string
  status: 'AGUARDANDO' | 'EM_ANDAMENTO'
  position: number | null
  estimatedMinutes: number | null
  enteredAt: Date
  startedAt: Date | null
  serviceOrder: {
    id: string
    number: string
    customer: { id: string; name: string }
    vehicle: { id: string; plate: string; brand: string | null; model: string | null }
    responsibleUser: { id: string; name: string } | null
  }
}

export async function getInternalQueue(tenantId: string): Promise<InternalQueueEntry[]> {
  const entries = await prisma.queueEntry.findMany({
    where: {
      tenantId,
      status: { in: ['AGUARDANDO', 'EM_ANDAMENTO'] },
    },
    orderBy: [{ status: 'asc' }, { position: 'asc' }, { enteredAt: 'asc' }],
    select: {
      id: true,
      serviceOrderId: true,
      status: true,
      position: true,
      estimatedMinutes: true,
      enteredAt: true,
      startedAt: true,
      serviceOrder: {
        select: {
          id: true,
          number: true,
          customer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, plate: true, brand: true, model: true } },
          responsibleUser: { select: { id: true, name: true } },
        },
      },
    },
  })

  return entries as InternalQueueEntry[]
}
