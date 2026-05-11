'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from '@/components/shared/SessionProvider'
import CarWashConfigForm from '@/components/forms/CarWashConfigForm'
import ServiceTypeForm from '@/components/forms/ServiceTypeForm'

interface CarWashConfigData {
  businessName: string
  slug: string
  config: {
    simultaneousSlots: number
    phone: string | null
    address: string | null
    logoFileId: string | null
  } | null
}

interface ServiceType {
  id: string
  name: string
  basePrice: string | number
  estimatedMinutes: number
  isActive: boolean
}

export default function ConfiguracoesPage() {
  const { authFetch, user } = useSession()
  const [config, setConfig] = useState<CarWashConfigData | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [stLoading, setStLoading] = useState(true)
  const [stError, setStError] = useState<string | null>(null)

  const [showServiceTypeForm, setShowServiceTypeForm] = useState(false)
  const [editingServiceType, setEditingServiceType] = useState<ServiceType | null>(null)

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true)
    setConfigError(null)
    try {
      const res = await authFetch('/api/configuracoes')
      const json = await res.json()
      if (json.success) {
        setConfig(json.data)
      } else {
        setConfigError(json.error ?? 'Erro ao carregar configurações')
      }
    } catch {
      setConfigError('Erro de conexão')
    } finally {
      setConfigLoading(false)
    }
  }, [authFetch])

  const fetchServiceTypes = useCallback(async () => {
    setStLoading(true)
    setStError(null)
    try {
      const res = await authFetch('/api/configuracoes/tipos-servico?includeInactive=true')
      const json = await res.json()
      if (json.success) {
        setServiceTypes(json.data)
      } else {
        setStError(json.error ?? 'Erro ao carregar tipos de serviço')
      }
    } catch {
      setStError('Erro de conexão')
    } finally {
      setStLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    if (user?.role !== 'GERENTE') return
    void fetchConfig()
    void fetchServiceTypes()
  }, [fetchConfig, fetchServiceTypes, user?.role])

  // GERENTE guard — after all hooks
  if (user?.role !== 'GERENTE') {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Acesso restrito a gerentes.</p>
      </div>
    )
  }

  const handleDeactivateServiceType = async (id: string) => {
    if (!confirm('Desativar este tipo de serviço?')) return
    try {
      const res = await authFetch(`/api/configuracoes/tipos-servico/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        void fetchServiceTypes()
      } else {
        alert(json.error ?? 'Erro ao desativar tipo de serviço')
      }
    } catch {
      alert('Erro de conexão')
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie os dados do seu lava-jato e tipos de serviço</p>
      </div>

      {/* CarWashConfig Section */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          Dados do estabelecimento
        </h2>
        {configLoading ? (
          <p className="text-sm text-gray-500">Carregando…</p>
        ) : configError ? (
          <p className="text-sm text-red-600">{configError}</p>
        ) : config ? (
          <CarWashConfigForm
            authFetch={authFetch}
            existing={config}
            onSuccess={() => void fetchConfig()}
          />
        ) : null}
      </section>

      {/* ServiceType Section */}
      <section>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Tipos de serviço</h2>
          <button
            onClick={() => { setEditingServiceType(null); setShowServiceTypeForm(true) }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Novo tipo
          </button>
        </div>

        {/* ServiceType Form Modal */}
        {showServiceTypeForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {editingServiceType ? 'Editar tipo de serviço' : 'Novo tipo de serviço'}
              </h3>
              <ServiceTypeForm
                authFetch={authFetch}
                existing={editingServiceType ?? undefined}
                onSuccess={() => {
                  setShowServiceTypeForm(false)
                  setEditingServiceType(null)
                  void fetchServiceTypes()
                }}
                onCancel={() => { setShowServiceTypeForm(false); setEditingServiceType(null) }}
              />
            </div>
          </div>
        )}

        {stLoading ? (
          <p className="text-sm text-gray-500">Carregando…</p>
        ) : stError ? (
          <p className="text-sm text-red-600">{stError}</p>
        ) : serviceTypes.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum tipo de serviço cadastrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Preço base</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Tempo (min)</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {serviceTypes.map((st) => (
                  <tr key={st.id} className={!st.isActive ? 'opacity-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{st.name}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {Number(st.basePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{st.estimatedMinutes}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          st.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {st.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {st.isActive && (
                          <>
                            <button
                              onClick={() => { setEditingServiceType(st); setShowServiceTypeForm(true) }}
                              className="rounded px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => void handleDeactivateServiceType(st.id)}
                              className="rounded px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200"
                            >
                              Desativar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
