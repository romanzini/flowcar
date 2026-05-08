'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/components/shared/SessionProvider'

interface Employee {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  isActive: boolean
  createdAt: string
}

export default function FuncionariosPage() {
  const { authFetch, user } = useSession()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  async function fetchEmployees() {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/funcionarios')
      const json = await res.json()
      if (json.success) {
        setEmployees(json.data)
      } else {
        setError(json.error ?? 'Erro ao carregar funcionários')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchEmployees()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDeactivate(id: string) {
    if (!confirm('Desativar este funcionário?')) return
    try {
      const res = await authFetch(`/api/funcionarios/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        await fetchEmployees()
      } else {
        alert(json.error ?? 'Erro ao desativar')
      }
    } catch {
      alert('Erro de conexão')
    }
  }

  if (user?.role !== 'GERENTE') {
    return (
      <div>
        <p className="text-red-600">Acesso restrito a gerentes.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
        <button
          onClick={() => { setEditingEmployee(null); setShowForm(true) }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Novo funcionário
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <EmployeeFormInline
            employee={editingEmployee}
            tenantId={user.tenantId}
            authFetch={authFetch}
            onSuccess={() => { setShowForm(false); setEditingEmployee(null); void fetchEmployees() }}
            onCancel={() => { setShowForm(false); setEditingEmployee(null) }}
          />
        </div>
      )}

      {loading && <p className="text-gray-500">Carregando…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">E-mail</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Papel</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr key={emp.id} className={!emp.isActive ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      emp.role === 'GERENTE'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {emp.role === 'GERENTE' ? 'Gerente' : 'Funcionário'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      emp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingEmployee(emp); setShowForm(true) }}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Editar
                      </button>
                      {emp.isActive && emp.id !== user?.id && (
                        <button
                          onClick={() => handleDeactivate(emp.id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Desativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nenhum funcionário cadastrado
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

// Inline form for create/edit without full page navigation
import EmployeeForm from '@/components/forms/EmployeeForm'

function EmployeeFormInline({
  employee,
  tenantId,
  authFetch,
  onSuccess,
  onCancel,
}: {
  employee: Employee | null
  tenantId: string
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>
  onSuccess: () => void
  onCancel: () => void
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {employee ? 'Editar funcionário' : 'Novo funcionário'}
      </h2>
      <EmployeeForm
        employee={employee}
        tenantId={tenantId}
        authFetch={authFetch}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </div>
  )
}
