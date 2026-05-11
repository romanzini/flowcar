'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/components/shared/SessionProvider'
import ContractForm from '@/components/forms/ContractForm'

type ContractStatus = 'RASCUNHO' | 'AGUARDANDO_ASSINATURA' | 'ASSINADO' | 'CANCELADO'

interface Contract {
  id: string
  customerId: string
  number: string
  title: string
  contentHtml: string
  status: ContractStatus
  signedAt: string | null
  pdfFileId: string | null
  createdAt: string
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
  }
  signature: {
    signedAt: string
    signedIp: string
    signedUserAgent: string | null
  } | null
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

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'td', 'th']
const ALLOWED_ATTR = ['colspan', 'rowspan']

function maskIp(ip: string): string {
  const parts = ip.split('.')
  return parts.length === 4 ? `${parts[0]}.xxx.xxx.${parts[3]}` : ip
}

export default function ContratoDetailPage() {
  const { authFetch, user } = useSession()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const sanitizedContent = useMemo(
    () =>
      contract
        ? DOMPurify.sanitize(contract.contentHtml, {
            ALLOWED_TAGS: [...ALLOWED_TAGS],
            ALLOWED_ATTR: [...ALLOWED_ATTR],
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
          })
        : '',
    [contract]
  )

  const fetchContract = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/contratos/${id}`)
      const json = await res.json()
      if (json.success) {
        setContract(json.data)
      } else {
        setError(json.error ?? 'Erro ao carregar contrato')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [authFetch, id])

  useEffect(() => {
    if (user?.role === 'GERENTE') {
      void fetchContract()
    } else {
      setLoading(false)
    }
  }, [fetchContract, user?.role])

  const generateLink = async () => {
    setActionLoading(true)
    setActionError(null)
    setGeneratedUrl(null)
    try {
      const res = await authFetch(`/api/contratos/${id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (json.success) {
        const publicUrl = json.data.publicUrl as string
        setGeneratedUrl(publicUrl)
        await navigator.clipboard.writeText(publicUrl)
      } else {
        setActionError(json.error ?? 'Erro ao gerar link')
      }
    } catch {
      setActionError('Erro de conexão')
    } finally {
      setActionLoading(false)
    }
  }

  const downloadPdf = async () => {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await authFetch(`/api/contratos/${id}/pdf`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setActionError((json as { error?: string }).error ?? 'Erro ao gerar PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `contrato-${contract?.number ?? id}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
      await fetchContract()
    } catch {
      setActionError('Erro ao gerar PDF')
    } finally {
      setActionLoading(false)
    }
  }

  if (user?.role !== 'GERENTE') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Acesso restrito a gerentes.
      </div>
    )
  }

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Carregando contrato...</div>
  }

  if (error || !contract) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600">{error ?? 'Contrato não encontrado'}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 hover:underline">
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">
          ← Voltar
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Contrato {contract.number}</h1>
          <p className="text-sm text-gray-500">
            Criado em {new Date(contract.createdAt).toLocaleDateString('pt-BR')} • {contract.title}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[contract.status]}`}>
          {STATUS_LABELS[contract.status]}
        </span>
      </div>

      {actionError && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}
      {generatedUrl && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Link copiado para a área de transferência: <span className="font-medium break-all">{generatedUrl}</span>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {contract.status === 'RASCUNHO' && (
          <>
            <button
              onClick={generateLink}
              disabled={actionLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? 'Processando...' : 'Gerar Link de Assinatura'}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Editar
            </button>
          </>
        )}
        {contract.status === 'AGUARDANDO_ASSINATURA' && (
          <button
            onClick={generateLink}
            disabled={actionLoading}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {actionLoading ? 'Processando...' : 'Gerar Novo Link'}
          </button>
        )}
        {contract.status === 'ASSINADO' && (
          <button
            onClick={downloadPdf}
            disabled={actionLoading}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading
              ? 'Processando...'
              : contract.pdfFileId
                ? 'Download PDF'
                : 'Gerar PDF'}
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Cliente</h2>
          <p className="font-medium text-gray-900">{contract.customer.name}</p>
          {contract.customer.phone && <p className="text-sm text-gray-600">{contract.customer.phone}</p>}
          {contract.customer.email && <p className="text-sm text-gray-600">{contract.customer.email}</p>}
          {contract.customer.address && <p className="text-sm text-gray-600">{contract.customer.address}</p>}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Status</h2>
          <p className="text-sm text-gray-700">Atual: {STATUS_LABELS[contract.status]}</p>
          {contract.signedAt && (
            <p className="mt-2 text-sm text-gray-700">
              Assinado em {new Date(contract.signedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b bg-gray-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Conteúdo do Contrato</h2>
        </div>
        <div className="prose max-w-none px-4 py-4 prose-headings:text-gray-900 prose-p:text-gray-700">
          <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
        </div>
      </div>

      {contract.signature && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Assinatura</h2>
          <p className="text-sm text-gray-700">
            Assinado em {new Date(contract.signature.signedAt).toLocaleString('pt-BR')}
          </p>
          <p className="mt-1 text-sm text-gray-700">IP: {maskIp(contract.signature.signedIp)}</p>
          {contract.signature.signedUserAgent && (
            <p className="mt-1 text-xs text-gray-500 break-all">{contract.signature.signedUserAgent}</p>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Editar Contrato</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="p-4">
              <ContractForm
                contract={contract}
                onSuccess={(updatedContract) => {
                  setContract((current) => (current ? { ...current, ...updatedContract } : current))
                  setShowForm(false)
                  void fetchContract()
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
