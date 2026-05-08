'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/shared/SessionProvider'

type OSStatus = 'AGUARDANDO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO'

interface ServiceOrder {
  id: string
  number: string
  status: OSStatus
  totalAmount: string
  createdAt: string
  customer: { name: string }
  vehicle: { plate: string; brand: string | null; model: string | null }
  responsibleUser: { name: string } | null
}

const STATUS_LABELS: Record<OSStatus, string> = {
  AGUARDANDO: 'Aguardando',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

const STATUS_COLORS: Record<OSStatus, string> = {
  AGUARDANDO: 'bg-yellow-100 text-yellow-800',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
  CONCLUIDO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
}

const TABS: { label: string; value: string }[] = [
  { label: 'Todos', value: '' },
  { label: 'Aguardando', value: 'AGUARDANDO' },
  { label: 'Em andamento', value: 'EM_ANDAMENTO' },
  { label: 'Concluídos', value: 'CONCLUIDO' },
  { label: 'Cancelados', value: 'CANCELADO' },
]

export default function OrdensServicoPage() {
  const { authFetch } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = activeTab ? `?status=${activeTab}` : ''
      const res = await authFetch(`/api/ordens-servico${params}`)
      const json = await res.json()
      if (json.success) {
        setOrders(json.data)
      } else {
        setError(json.error ?? 'Erro ao carregar ordens de serviço')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [authFetch, activeTab])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
        <button
          onClick={() => router.push('/ordens-servico/nova')}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nova OS
        </button>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-4">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading && <p className="text-gray-500">Carregando…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Número</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Veículo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Responsável</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{order.number}</td>
                  <td className="px-4 py-3 text-gray-700">{order.customer.name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="font-mono">{order.vehicle.plate}</span>
                    {(order.vehicle.brand || order.vehicle.model) && (
                      <span className="ml-1 text-gray-400 text-xs">
                        {[order.vehicle.brand, order.vehicle.model].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order.responsibleUser?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {Number(order.totalAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/ordens-servico/${order.id}`)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Nenhuma ordem de serviço encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
