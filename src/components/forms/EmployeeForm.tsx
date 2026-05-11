'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { employeeCreateSchema, employeeUpdateSchema, type EmployeeCreateInput, type EmployeeUpdateInput } from '@/lib/validations/user'

interface Employee {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  isActive: boolean
}

interface EmployeeFormProps {
  employee?: Employee | null
  tenantId: string
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>
  onSuccess: () => void
  onCancel: () => void
}

export default function EmployeeForm({ employee, authFetch, onSuccess, onCancel }: EmployeeFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!employee

  const schema = isEditing ? employeeUpdateSchema : employeeCreateSchema

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: employee
      ? { name: employee.name, email: employee.email, role: employee.role as 'GERENTE' | 'FUNCIONARIO', phone: employee.phone ?? undefined }
      : undefined,
  })

  async function onSubmit(values: EmployeeCreateInput | EmployeeUpdateInput) {
    setServerError(null)

    // Remove empty password on edit
    const payload = { ...values }
    if (isEditing && !('password' in payload && payload.password)) {
      delete (payload as Partial<EmployeeCreateInput>).password
    }

    try {
      const url = isEditing ? `/api/funcionarios/${employee!.id}` : '/api/funcionarios'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setServerError(json.error ?? 'Erro ao salvar funcionário')
        return
      }

      onSuccess()
    } catch {
      setServerError('Erro de conexão. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            {isEditing ? 'Nova senha (deixe em branco para não alterar)' : 'Senha'}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Papel
          </label>
          <select
            id="role"
            {...register('role')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="FUNCIONARIO">Funcionário</option>
            <option value="GERENTE">Gerente</option>
          </select>
          {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Telefone (opcional)
          </label>
          <input
            id="phone"
            type="tel"
            {...register('phone')}
            placeholder="(11) 99999-9999"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>
      </div>

      {serverError && (
        <p className="text-sm text-red-600">{serverError}</p>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar funcionário'}
        </button>
      </div>
    </form>
  )
}
