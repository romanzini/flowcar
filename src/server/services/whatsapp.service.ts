import { prisma } from '@/lib/prisma'
import { whatsappQueue } from '@/lib/jobs/whatsapp.worker'

export type NotificationEvent = 'FILA_ATUALIZADA' | 'OS_CONCLUIDA' | 'OS_CANCELADA'

export async function enqueueNotification(
  tenantId: string,
  customerId: string,
  serviceOrderId: string | null,
  event: NotificationEvent
): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { whatsappPhone: true },
  })

  if (!customer?.whatsappPhone) return

  const notification = await prisma.whatsAppNotification.create({
    data: {
      tenantId,
      customerId,
      serviceOrderId,
      event,
      targetPhone: customer.whatsappPhone,
      payloadJson: {},
      status: 'PENDENTE',
    },
    select: { id: true },
  })

  // SEC-013: job payload contains only notificationId; worker reads all PII from DB
  await whatsappQueue.add('send', { notificationId: notification.id })
}
