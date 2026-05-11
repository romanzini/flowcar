'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/shared/SessionProvider'
import ContractForm from '@/components/forms/ContractForm'

type ContractStatus = 'RASCUNHO' | 'AGUARDANDO_ASSINATURA' | 'ASSINADO' | 'CANCELADO'

interface Contract {
  id: string
  number: string
  title: string
  status: ContractStatus
  createdAt: string
  customer: { id: string; name: string }
}

const STATUS_LABELS: Record<ContractStatus, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_ASSINATURA: 'Aguardando Assinatura',
  ASSINADO: 'Assinado',
  CANCELADO: 'Cancelado',
}

const STATUS_COLORS: Record<ContractStatus, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-700',
  AGUARDANDO_ASSINATURA: 'bg-amber-100 text-amber-800',
  ASSINADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
}

const TABS: { label: string; value: string }[] = [
  { label: 'Todos', value: '' },
  { label: 'Rascunho', value: 'RASCUNHO' },
  { label: 'Aguardando Assinatura', value: 'AGUARDANDO_ASSINATURA' },
  { label: 'Assinado', value: 'ASSINADO' },
  { label: 'Cancelado', value: 'CANCELADO' },
]

export default function ContratosPage() {
  const { authFetch, user } = useSession()
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('')
  const [showForm, setShowForm] = useState(false)

  const fetchContracts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = activeTab ? `?status=${activeTab}` : ''
      const res = await authFetch(`/api/contratos${params}`)
      const json = await res.json()
      if (json.success) {
        setContracts(json.data)
      } else {
        setError(json.error ?? 'Erro ao carregar contratos')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [activeTab, authFetch])

  useEffect(() => {
    if (user?.role === 'GERENTE') {
      void fetchContracts()
    } else {
      setLoading(false)
    }
  }, [fetchContracts, user?.role])

  if (user?.role !== 'GERENTE') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Acesso restrito a gerentes.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Novo Contrato
        </button>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-8 text-center text-gray-500">Carregando contratos...</div>
      ) : contracts.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          {activeTab ? 'Nenhum contrato com este status.' : 'Nenhum contrato cadastrado.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Número</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Título</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{contract.number}</td>
                  <td className="px-4 py-3">{contract.customer.name}</td>
                  <td className="px-4 py-3">{contract.title}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[contract.status]}`}
                    >
                      {STATUS_LABELS[contract.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(contract.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => router.push(`/contratos/${contract.id}`)}
                      className="text-xs text-blue-600 hover:underline"
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Novo Contrato</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="p-4">
              <ContractForm
                onSuccess={(contract) => {
                  setShowForm(false)
                  router.push(`/contratos/${contract.id}`)
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
