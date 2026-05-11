'use client'

import { useEffect, useState, useCallback } from 'react'
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
  initialData?: PublicQueueData | null
  slug: string
}

export default function PublicQueuePage({ initialData, slug }: Props) {
  const [data, setData] = useState<PublicQueueData | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`/api/fila-publica/${slug}`)
      if (res.status === 404) {
        setData(null)
        setError('Fila não encontrada.')
        return
      }

      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setData(json.data)
          return
        }
      }

      setError('Não foi possível carregar a fila no momento.')
    } catch {
      setError((current) => current ?? 'Não foi possível carregar a fila no momento.')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    if (!initialData) {
      void refresh()
    }
  }, [initialData, refresh])

  if (loading && !data) {
    return (
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Carregando fila...
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {error ?? 'Fila não encontrada.'}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        )}
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
