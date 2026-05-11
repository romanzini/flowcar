'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/components/shared/SessionProvider'
import CustomerForm from '@/components/forms/CustomerForm'
import VehicleForm from '@/components/forms/VehicleForm'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsappPhone: string | null
  cpfCnpj: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Vehicle {
  id: string
  plate: string
  brand: string | null
  model: string | null
  year: number | null
  color: string | null
  isActive: boolean
}

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { authFetch } = useSession()
  const router = useRouter()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)

  const fetchCustomer = useCallback(async () => {
    try {
      const res = await authFetch(`/api/clientes/${id}`)
      const json = await res.json()
      if (json.success) {
        setCustomer(json.data)
      } else {
        setError(json.error ?? 'Cliente não encontrado')
      }
    } catch {
      setError('Erro de conexão')
    }
  }, [authFetch, id])

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await authFetch(`/api/veiculos?customerId=${id}`)
      const json = await res.json()
      if (json.success) {
        setVehicles(json.data)
      }
    } catch {
      // vehicles load is non-critical
    }
  }, [authFetch, id])

  useEffect(() => {
    async function load() {
      setLoading(true)
      await Promise.all([fetchCustomer(), fetchVehicles()])
      setLoading(false)
    }
    void load()
  }, [fetchCustomer, fetchVehicles])

  async function handleDeactivateCustomer() {
    if (!confirm('Desativar este cliente?')) return
    try {
      const res = await authFetch(`/api/clientes/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        router.push('/clientes')
      } else {
        alert(json.error ?? 'Erro ao desativar cliente')
      }
    } catch {
      alert('Erro de conexão')
    }
  }

  async function handleDeactivateVehicle(vehicleId: string) {
    if (!confirm('Desativar este veículo?')) return
    try {
      const res = await authFetch(`/api/veiculos/${vehicleId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        await fetchVehicles()
      } else {
        alert(json.error ?? 'Erro ao desativar veículo')
      }
    } catch {
      alert('Erro de conexão')
    }
  }

  if (loading) return <p className="text-gray-500">Carregando…</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!customer) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/clientes')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Clientes
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            customer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {customer.isActive ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        {customer.isActive && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditForm(true)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Editar
            </button>
            <button
              onClick={handleDeactivateCustomer}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
            >
              Desativar
            </button>
          </div>
        )}
      </div>

      {showEditForm && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Editar cliente</h2>
          <CustomerForm
            customer={customer}
            authFetch={authFetch}
            onSuccess={() => { setShowEditForm(false); void fetchCustomer() }}
            onCancel={() => setShowEditForm(false)}
          />
        </div>
      )}

      {/* Customer info card */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">E-mail</dt>
            <dd className="mt-1 text-sm text-gray-900">{customer.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Telefone</dt>
            <dd className="mt-1 text-sm text-gray-900">{customer.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">WhatsApp</dt>
            <dd className="mt-1 text-sm text-gray-900">{customer.whatsappPhone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">CPF/CNPJ</dt>
            <dd className="mt-1 text-sm font-mono text-gray-900">{customer.cpfCnpj ?? '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Endereço</dt>
            <dd className="mt-1 text-sm text-gray-900">{customer.address ?? '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Vehicles section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Veículos</h2>
          {customer.isActive && (
            <button
              onClick={() => { setEditingVehicle(null); setShowVehicleForm(true) }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Adicionar veículo
            </button>
          )}
        </div>

        {showVehicleForm && (
          <div className="mb-4 rounded-md border border-gray-200 p-4">
            <h3 className="text-base font-medium text-gray-900 mb-3">
              {editingVehicle ? 'Editar veículo' : 'Novo veículo'}
            </h3>
            <VehicleForm
              vehicle={editingVehicle}
              customerId={customer.id}
              authFetch={authFetch}
              onSuccess={() => { setShowVehicleForm(false); setEditingVehicle(null); void fetchVehicles() }}
              onCancel={() => { setShowVehicleForm(false); setEditingVehicle(null) }}
            />
          </div>
        )}

        {vehicles.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum veículo cadastrado</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="pb-2 text-left font-medium text-gray-600">Placa</th>
                <th className="pb-2 text-left font-medium text-gray-600">Marca/Modelo</th>
                <th className="pb-2 text-left font-medium text-gray-600">Ano</th>
                <th className="pb-2 text-left font-medium text-gray-600">Cor</th>
                <th className="pb-2 text-left font-medium text-gray-600">Status</th>
                <th className="pb-2 text-left font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className={!vehicle.isActive ? 'opacity-50' : ''}>
                  <td className="py-3 font-mono font-medium text-gray-900">{vehicle.plate}</td>
                  <td className="py-3 text-gray-600">
                    {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="py-3 text-gray-600">{vehicle.year ?? '—'}</td>
                  <td className="py-3 text-gray-600">{vehicle.color ?? '—'}</td>
                  <td className="py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      vehicle.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {vehicle.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      {vehicle.isActive && (
                        <>
                          <button
                            onClick={() => { setEditingVehicle(vehicle); setShowVehicleForm(true) }}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeactivateVehicle(vehicle.id)}
                            className="text-red-600 hover:underline text-xs"
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
        )}
      </div>
    </div>
  )
}
