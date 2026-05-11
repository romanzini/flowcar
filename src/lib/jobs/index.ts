let initialized = false

export function initWorkers() {
  if (initialized) return
  initialized = true

  // Only run workers on the server side
  if (typeof window !== 'undefined') return

  // Dynamically import to avoid loading BullMQ in client bundles
  import('@/lib/jobs/whatsapp.worker').then(({ startWhatsAppWorker }) => {
    startWhatsAppWorker()
  }).catch((err: unknown) => {
    console.error('[jobs] Failed to start WhatsApp worker:', err)
  })

  import('@/lib/jobs/quote-expiration.worker').then(
    ({ startQuoteExpirationWorker, scheduleQuoteExpiration }) => {
      startQuoteExpirationWorker()
      scheduleQuoteExpiration().catch((err: unknown) => {
        console.error('[jobs] Failed to schedule quote expiration:', err)
      })
    }
  ).catch((err: unknown) => {
    console.error('[jobs] Failed to start quote expiration worker:', err)
  })
}
