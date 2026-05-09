'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/components/shared/SessionProvider'

type QuoteStatus = 'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO'

interface QuoteItem {
  id: string
  description: string
  quantity: string | number
  unitPrice: string | number
  discountAmount: string | number
  subtotal: string | number
  serviceType: { name: string } | null
}

interface Quote {
  id: string
  number: string
  status: QuoteStatus
  validUntil: string
  totalAmount: string | number
  sentAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  expiredAt: string | null
  convertedOrderId: string | null
  pdfFileId: string | null
  customer: { id: string; name: string; phone: string | null; email: string | null }
  vehicle: { id: string; plate: string; brand: string; model: string; year: number | null } | null
  items: QuoteItem[]
  convertedOrder: { id: string; number: string } | null
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  EXPIRADO: 'Expirado',
}

const STATUS_COLORS: Record<QuoteStatus, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-700',
  ENVIADO: 'bg-blue-100 text-blue-800',
  APROVADO: 'bg-green-100 text-green-800',
  REJEITADO: 'bg-red-100 text-red-800',
  EXPIRADO: 'bg-orange-100 text-orange-800',
}

export default function QuoteDetailPage() {
  const { authFetch } = useSession()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchQuote = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/orcamentos/${id}`)
      const json = await res.json()
      if (json.success) {
        setQuote(json.data)
      } else {
        setError(json.error ?? 'Erro ao carregar orçamento')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [authFetch, id])

  useEffect(() => {
    void fetchQuote()
  }, [fetchQuote])

  const transition = async (status: string) => {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await authFetch(`/api/orcamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (json.success) {
        setQuote(json.data)
      } else {
        setActionError(json.error ?? 'Erro ao atualizar status')
      }
    } catch {
      setActionError('Erro de conexão')
    } finally {
      setActionLoading(false)
    }
  }

  const downloadPDF = async () => {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await authFetch(`/api/orcamentos/${id}/pdf`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setActionError((json as { error?: string }).error ?? 'Erro ao gerar PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orcamento-${quote?.number ?? id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setActionError('Erro ao gerar PDF')
    } finally {
      setActionLoading(false)
    }
  }

  const convertToOS = async () => {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await authFetch(`/api/orcamentos/${id}/converter`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        const data = json.data as { alreadyConverted: boolean; serviceOrder: { id: string; number: string } }
        if (data.alreadyConverted) {
          setActionError(`Já convertido na OS ${data.serviceOrder.number}`)
        } else {
          router.push(`/ordens-servico/${data.serviceOrder.id}`)
        }
      } else {
        setActionError(json.error ?? 'Erro ao converter em OS')
      }
    } catch {
      setActionError('Erro de conexão')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Carregando orçamento...</div>
  }

  if (error || !quote) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600">{error ?? 'Orçamento não encontrado'}</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline text-sm">
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Voltar
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Orçamento {quote.number}</h1>
          <p className="text-sm text-gray-500">
            Criado em {new Date(quote.validUntil).toLocaleDateString('pt-BR')} • Válido até{' '}
            {new Date(quote.validUntil).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[quote.status]}`}>
          {STATUS_LABELS[quote.status]}
        </span>
      </div>

      {actionError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{actionError}</div>
      )}

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {quote.status === 'RASCUNHO' && (
          <button
            onClick={() => transition('ENVIADO')}
            disabled={actionLoading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Marcar como Enviado
          </button>
        )}
        {quote.status === 'ENVIADO' && (
          <>
            <button
              onClick={() => transition('APROVADO')}
              disabled={actionLoading}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Aprovar
            </button>
            <button
              onClick={() => transition('REJEITADO')}
              disabled={actionLoading}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Rejeitar
            </button>
          </>
        )}
        <button
          onClick={downloadPDF}
          disabled={actionLoading}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {actionLoading ? 'Gerando PDF...' : 'Baixar PDF'}
        </button>
        {quote.status === 'APROVADO' && !quote.convertedOrderId && (
          <button
            onClick={convertToOS}
            disabled={actionLoading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Converter em OS
          </button>
        )}
        {quote.convertedOrder && (
          <button
            onClick={() => router.push(`/ordens-servico/${quote.convertedOrder!.id}`)}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Ver OS {quote.convertedOrder.number}
          </button>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">Cliente</h2>
          <p className="font-medium text-gray-900">{quote.customer.name}</p>
          {quote.customer.phone && <p className="text-sm text-gray-600">{quote.customer.phone}</p>}
          {quote.customer.email && <p className="text-sm text-gray-600">{quote.customer.email}</p>}
        </div>

        {quote.vehicle && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">Veículo</h2>
            <p className="font-medium font-mono text-gray-900">{quote.vehicle.plate}</p>
            <p className="text-sm text-gray-600">
              {quote.vehicle.brand} {quote.vehicle.model}
              {quote.vehicle.year ? ` (${quote.vehicle.year})` : ''}
            </p>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b px-4 py-3 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Itens do Orçamento</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-center">Qtd</th>
              <th className="px-4 py-3 text-right">Preço Unit.</th>
              <th className="px-4 py-3 text-right">Desconto</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quote.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{item.description}</p>
                  {item.serviceType && (
                    <p className="text-xs text-gray-500">{item.serviceType.name}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-center">{Number(item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</td>
                <td className="px-4 py-3 text-right">
                  R$ {Number(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right">
                  {Number(item.discountAmount) > 0
                    ? `R$ ${Number(item.discountAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  R$ {Number(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-right font-semibold">Total</td>
              <td className="px-4 py-3 text-right font-bold text-blue-600">
                R$ {Number(quote.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
