import { Worker, Queue } from 'bullmq'
import { createBullMQConnection } from '@/lib/auth/redis'
import { prisma } from '@/lib/prisma'
import twilio from 'twilio'

const QUEUE_NAME = 'whatsapp-notifications'

export const whatsappQueue = new Queue(QUEUE_NAME, {
  connection: createBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 10,
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
  },
})

const EVENT_MESSAGES: Record<string, string> = {
  FILA_ATUALIZADA: 'Olá! Sua posição na fila foi atualizada. Em breve seu veículo será atendido.',
  OS_CONCLUIDA: 'Seu veículo foi concluído e está pronto para retirada! Obrigado pela preferência.',
  OS_CANCELADA: 'Sua ordem de serviço foi cancelada. Entre em contato para mais informações.',
}

export function startWhatsAppWorker() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  const twilioClient =
    accountSid && authToken ? twilio(accountSid, authToken) : null

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { notificationId } = job.data as { notificationId: string }

      const notification = await prisma.whatsAppNotification.findUnique({
        where: { id: notificationId },
        select: {
          id: true,
          targetPhone: true,
          event: true,
          status: true,
          attempts: true,
        },
      })

      if (!notification) {
        console.warn(`[whatsapp] Notification ${notificationId} not found, skipping`)
        return
      }

      if (notification.status === 'ENVIADA') {
        console.log(`[whatsapp] Notification ${notificationId} already sent, skipping`)
        return
      }

      await prisma.whatsAppNotification.update({
        where: { id: notificationId },
        data: { status: 'ENVIANDO', attempts: { increment: 1 } },
      })

      const body = EVENT_MESSAGES[notification.event] ?? 'Atualização sobre seu serviço.'
      const to = `whatsapp:${notification.targetPhone}`

      try {
        if (!twilioClient || !from) {
          throw new Error('Twilio not configured — check TWILIO_* env vars')
        }

        const message = await twilioClient.messages.create({
          from: `whatsapp:${from}`,
          to,
          body,
        })

        await prisma.whatsAppNotification.update({
          where: { id: notificationId },
          data: {
            status: 'ENVIADA',
            providerMessageId: message.sid,
            sentAt: new Date(),
            lastError: null,
          },
        })

        console.log(`[whatsapp] Sent ${notificationId} → ${message.sid}`)
      } catch (err) {
        const lastError = err instanceof Error ? err.message : String(err)
        await prisma.whatsAppNotification.update({
          where: { id: notificationId },
          data: { status: 'FALHA', lastError },
        })
        throw err
      }
    },
    { connection: createBullMQConnection() }
  )

  worker.on('failed', (job, err) => {
    console.error(`[whatsapp] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
