import { Worker, Queue } from 'bullmq'
import { createBullMQConnection } from '@/lib/auth/redis'
import { prisma } from '@/lib/prisma'

const QUEUE_NAME = 'quote-expiration'

// ─── BullMQ Queue ─────────────────────────────────────────────────────────────
export const quoteExpirationQueue = new Queue(QUEUE_NAME, {
  connection: createBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
  },
})

// Schedule daily cron if not already scheduled
export async function scheduleQuoteExpiration() {
  await quoteExpirationQueue.upsertJobScheduler(
    'daily-quote-expiration',
    { pattern: '0 0 * * *' }, // daily at midnight
    {
      name: 'expire-quotes',
      data: {},
    }
  )
}

// ─── Worker ───────────────────────────────────────────────────────────────────
export function startQuoteExpirationWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const now = new Date()

      const expiredQuotes = await prisma.quote.findMany({
        where: {
          validUntil: { lt: now },
          status: { notIn: ['APROVADO', 'REJEITADO', 'EXPIRADO'] },
        },
        select: { id: true },
      })

      if (expiredQuotes.length === 0) return

      await prisma.quote.updateMany({
        where: {
          id: { in: expiredQuotes.map((q) => q.id) },
        },
        data: {
          status: 'EXPIRADO',
          expiredAt: now,
        },
      })

      console.log(`[quote-expiration] Expired ${expiredQuotes.length} quote(s)`)
    },
    { connection: createBullMQConnection() }
  )

  worker.on('failed', (job, err) => {
    console.error(`[quote-expiration] Job ${job?.id} failed:`, err)
  })

  return worker
}
