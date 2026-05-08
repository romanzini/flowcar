'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/components/shared/SessionProvider'
import FileUpload from '@/components/shared/FileUpload'
import PhotoGallery from '@/components/shared/PhotoGallery'

type OSStatus = 'AGUARDANDO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO'
type ItemKind = 'SERVICO' | 'PRODUTO'

interface OSItem {
  id: string
  kind: ItemKind
  description: string
  quantity: string
  unitPrice: string
  discountAmount: string
  subtotal: string
}

interface FileUploadRecord {
  id: string
  category: string
  objectKey: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

interface ServiceOrder {
  id: string
  number: string
  status: OSStatus
  subtotalAmount: string
  discountAmount: string
  totalAmount: string
  startedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  createdAt: string
  customer: { id: string; name: string; phone: string | null }
  vehicle: { id: string; plate: string; brand: string | null; model: string | null }
  responsibleUser: { name: string } | null
  items: OSItem[]
  queueEntry: { status: string; position: number | null; estimatedMinutes: number | null } | null
  fileUploads: FileUploadRecord[]
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

const NEXT_ACTIONS: Record<OSStatus, { label: string; status: string; color: string }[]> = {
  AGUARDANDO: [
    { label: 'Iniciar atendimento', status: 'EM_ANDAMENTO', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Cancelar OS', status: 'CANCELADO', color: 'bg-red-600 hover:bg-red-700' },
  ],
  EM_ANDAMENTO: [
    { label: 'Concluir OS', status: 'CONCLUIDO', color: 'bg-green-600 hover:bg-green-700' },
    { label: 'Cancelar OS', status: 'CANCELADO', color: 'bg-red-600 hover:bg-red-700' },
  ],
  CONCLUIDO: [],
  CANCELADO: [],
}

export default function OSDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { authFetch } = useSession()
  const router = useRouter()

  const [os, setOS] = useState<ServiceOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  const fetchOS = useCallback(async () => {
    try {
      const res = await authFetch(`/api/ordens-servico/${id}`)
      const json = await res.json()
      if (json.success) {
        setOS(json.data)
      } else {
        setError(json.error ?? 'OS não encontrada')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [authFetch, id])

  useEffect(() => {
    void fetchOS()
  }, [fetchOS])

  const handleTransition = async (status: string) => {
    setActionLoading(true)
    try {
      const res = await authFetch(`/api/ordens-servico/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (json.success) {
        setOS(json.data)
      } else {
        alert(json.error ?? 'Erro ao atualizar status')
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Remover este item?')) return
    try {
      const res = await authFetch(`/api/ordens-servico/${id}/items?itemId=${itemId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setOS(json.data)
      } else {
        alert(json.error ?? 'Erro ao remover item')
      }
    } catch {
      alert('Erro de conexão')
    }
  }

  if (loading) return <p className="text-gray-500">Carregando…</p>
  if (error || !os) return <p className="text-red-600">{error ?? 'OS não encontrada'}</p>

  const actions = NEXT_ACTIONS[os.status] ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
            ← Voltar
          </button>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 font-mono">{os.number}</h1>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[os.status]}`}>
            {STATUS_LABELS[os.status]}
          </span>
        </div>
        {actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map((action) => (
              <button
                key={action.status}
                onClick={() => void handleTransition(action.status)}
                disabled={actionLoading}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${action.color}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Cliente</h3>
          <p className="font-medium text-gray-900">{os.customer.name}</p>
          {os.customer.phone && <p className="text-sm text-gray-600">{os.customer.phone}</p>}
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Veículo</h3>
          <p className="font-mono font-medium text-gray-900">{os.vehicle.plate}</p>
          <p className="text-sm text-gray-600">
            {[os.vehicle.brand, os.vehicle.model].filter(Boolean).join(' ') || '—'}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Fila</h3>
          {os.queueEntry ? (
            <>
              <p className="font-medium text-gray-900">
                {os.queueEntry.status === 'AGUARDANDO'
                  ? `Posição ${os.queueEntry.position ?? '—'}`
                  : 'Em atendimento'}
              </p>
              {os.queueEntry.estimatedMinutes && (
                <p className="text-sm text-gray-600">{os.queueEntry.estimatedMinutes} min estimados</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Fora da fila</p>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div className="rounded-lg bg-white p-4 shadow text-sm text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="block text-xs text-gray-400">Criada em</span>
          {new Date(os.createdAt).toLocaleString('pt-BR')}
        </div>
        {os.startedAt && (
          <div>
            <span className="block text-xs text-gray-400">Iniciada em</span>
            {new Date(os.startedAt).toLocaleString('pt-BR')}
          </div>
        )}
        {os.completedAt && (
          <div>
            <span className="block text-xs text-gray-400">Concluída em</span>
            {new Date(os.completedAt).toLocaleString('pt-BR')}
          </div>
        )}
        {os.cancelledAt && (
          <div>
            <span className="block text-xs text-gray-400">Cancelada em</span>
            {new Date(os.cancelledAt).toLocaleString('pt-BR')}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Itens</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descrição</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qtd</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Preço unit.</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Desconto</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
              {(os.status === 'AGUARDANDO' || os.status === 'EM_ANDAMENTO') && (
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {os.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 text-gray-800">{item.description}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.kind === 'SERVICO' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {item.kind === 'SERVICO' ? 'Serviço' : 'Produto'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-gray-600">{Number(item.quantity).toLocaleString('pt-BR')}</td>
                <td className="px-4 py-2 text-right text-gray-600">
                  {Number(item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-2 text-right text-gray-600">
                  {Number(item.discountAmount) > 0
                    ? Number(item.discountAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : '—'}
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {Number(item.subtotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                {(os.status === 'AGUARDANDO' || os.status === 'EM_ANDAMENTO') && (
                  <td className="px-4 py-2">
                    <button
                      onClick={() => void handleRemoveItem(item.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {os.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  Nenhum item adicionado
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-sm font-medium text-gray-600">Total</td>
              <td className="px-4 py-2 text-right font-bold text-gray-900">
                {Number(os.totalAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
              {(os.status === 'AGUARDANDO' || os.status === 'EM_ANDAMENTO') && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Photos */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Fotos</h2>
          {(os.status === 'AGUARDANDO' || os.status === 'EM_ANDAMENTO') && (
            <button
              onClick={() => setShowUpload((v) => !v)}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              {showUpload ? 'Cancelar' : 'Adicionar foto'}
            </button>
          )}
        </div>

        {showUpload && (
          <div className="mb-4">
            <FileUpload
              authFetch={authFetch}
              category="FOTO_SERVICO"
              serviceOrderId={os.id}
              onSuccess={() => { setShowUpload(false); void fetchOS() }}
            />
          </div>
        )}

        <PhotoGallery
          authFetch={authFetch}
          files={os.fileUploads.filter((f) => f.category.startsWith('FOTO'))}
        />
      </div>
    </div>
  )
}
