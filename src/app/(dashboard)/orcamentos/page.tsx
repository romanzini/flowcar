'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/shared/SessionProvider'
import QuoteForm from '@/components/forms/QuoteForm'

type QuoteStatus = 'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO'

interface Quote {
  id: string
  number: string
  status: QuoteStatus
  validUntil: string
  totalAmount: string | number
  createdAt: string
  customer: { id: string; name: string }
  vehicle: { id: string; plate: string; brand: string; model: string } | null
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

const TABS: { label: string; value: string }[] = [
  { label: 'Todos', value: '' },
  { label: 'Rascunho', value: 'RASCUNHO' },
  { label: 'Enviado', value: 'ENVIADO' },
  { label: 'Aprovado', value: 'APROVADO' },
  { label: 'Rejeitado', value: 'REJEITADO' },
  { label: 'Expirado', value: 'EXPIRADO' },
]

export default function OrcamentosPage() {
  const { authFetch } = useSession()
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('')
  const [showForm, setShowForm] = useState(false)

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = activeTab ? `?status=${activeTab}` : ''
      const res = await authFetch(`/api/orcamentos${params}`)
      const json = await res.json()
      if (json.success) {
        setQuotes(json.data)
      } else {
        setError(json.error ?? 'Erro ao carregar orçamentos')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [authFetch, activeTab])

  useEffect(() => {
    void fetchQuotes()
  }, [fetchQuotes])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Novo Orçamento
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="flex -mb-px gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-500">Carregando orçamentos...</div>
      ) : quotes.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          {activeTab ? 'Nenhum orçamento com este status.' : 'Nenhum orçamento cadastrado.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Número</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Veículo</th>
                <th className="px-4 py-3 text-left">Válido até</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{quote.number}</td>
                  <td className="px-4 py-3">{quote.customer.name}</td>
                  <td className="px-4 py-3">
                    {quote.vehicle ? `${quote.vehicle.plate} — ${quote.vehicle.brand} ${quote.vehicle.model}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(quote.validUntil).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    R$ {Number(quote.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[quote.status]}`}>
                      {STATUS_LABELS[quote.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => router.push(`/orcamentos/${quote.id}`)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Quote modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Novo Orçamento</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4">
              <QuoteForm
                onSuccess={(quote) => {
                  setShowForm(false)
                  router.push(`/orcamentos/${quote.id}`)
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
