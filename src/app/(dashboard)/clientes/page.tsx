'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/shared/SessionProvider'
import CustomerForm from '@/components/forms/CustomerForm'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpfCnpj: string | null
  isActive: boolean
  createdAt: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

export default function ClientesPage() {
  const { authFetch } = useSession()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''
      const res = await authFetch(`/api/clientes${params}`)
      const json = await res.json()
      if (json.success) {
        setCustomers(json.data)
      } else {
        setError(json.error ?? 'Erro ao carregar clientes')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [authFetch, debouncedSearch])

  useEffect(() => {
    void fetchCustomers()
  }, [fetchCustomers])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Novo cliente
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Novo cliente</h2>
          <CustomerForm
            authFetch={authFetch}
            onSuccess={() => { setShowForm(false); void fetchCustomers() }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone…"
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {loading && <p className="text-gray-500">Carregando…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">E-mail</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">CPF/CNPJ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((customer) => (
                <tr key={customer.id} className={!customer.isActive ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                  <td className="px-4 py-3 text-gray-600">{customer.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{customer.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{customer.cpfCnpj ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      customer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {customer.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/clientes/${customer.id}`)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nenhum cliente encontrado
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
