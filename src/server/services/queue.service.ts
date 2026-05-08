import { prisma } from '@/lib/prisma'

export async function insertQueueEntry(
  tenantId: string,
  serviceOrderId: string,
  estimatedMinutes?: number
): Promise<void> {
  const lastEntry = await prisma.queueEntry.findFirst({
    where: { tenantId, status: 'AGUARDANDO' },
    orderBy: { position: 'desc' },
    select: { position: true },
  })

  const nextPosition = (lastEntry?.position ?? 0) + 1

  await prisma.queueEntry.create({
    data: {
      tenantId,
      serviceOrderId,
      status: 'AGUARDANDO',
      position: nextPosition,
      estimatedMinutes: estimatedMinutes ?? null,
    },
  })
}

export async function promoteToInProgress(serviceOrderId: string): Promise<void> {
  await prisma.queueEntry.update({
    where: { serviceOrderId },
    data: {
      status: 'EM_ANDAMENTO',
      position: null,
      startedAt: new Date(),
    },
  })
}

export async function removeFromQueue(serviceOrderId: string): Promise<string | null> {
  const entry = await prisma.queueEntry.findUnique({
    where: { serviceOrderId },
    select: { id: true, tenantId: true },
  })

  if (!entry) return null

  await prisma.queueEntry.delete({ where: { serviceOrderId } })
  return entry.tenantId
}

export async function resequencePositions(tenantId: string): Promise<void> {
  const waitingEntries = await prisma.queueEntry.findMany({
    where: { tenantId, status: 'AGUARDANDO' },
    orderBy: { enteredAt: 'asc' },
    select: { id: true },
  })

  await Promise.all(
    waitingEntries.map((entry, index) =>
      prisma.queueEntry.update({
        where: { id: entry.id },
        data: { position: index + 1 },
      })
    )
  )
}
