'use client'

import { useState, useCallback } from 'react'
import PublicQueueDisplay from '@/components/queue/PublicQueueDisplay'
import QueueRefreshTimer from '@/components/queue/QueueRefreshTimer'

interface PublicQueueItem {
  orderNumber: string
  maskedPlate: string
  status: 'AGUARDANDO' | 'EM_ANDAMENTO'
  position: number | null
  estimatedMinutes: number | null
}

interface PublicQueueData {
  tenantName: string
  slug: string
  simultaneousSlots: number
  inService: PublicQueueItem[]
  waiting: PublicQueueItem[]
  updatedAt: string
}

interface Props {
  initialData: PublicQueueData
  slug: string
}

export default function PublicQueuePage({ initialData, slug }: Props) {
  const [data, setData] = useState<PublicQueueData>(initialData)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/fila-publica/${slug}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) setData(json.data)
      }
    } catch {
      // silent — stale data is acceptable
    }
  }, [slug])

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{data.tenantName}</h1>
            <p className="text-sm text-muted-foreground">Acompanhamento da fila em tempo real</p>
          </div>
          <QueueRefreshTimer onRefresh={refresh} intervalSeconds={30} />
        </div>

        <PublicQueueDisplay inService={data.inService} waiting={data.waiting} />
      </div>
    </main>
  )
}
