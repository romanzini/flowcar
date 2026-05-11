'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  customerCreateSchema,
  customerUpdateSchema,
  type CustomerCreateInput,
  type CustomerUpdateInput,
} from '@/lib/validations/customer'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsappPhone: string | null
  cpfCnpj: string | null
  address: string | null
}

interface CustomerFormProps {
  customer?: Customer | null
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>
  onSuccess: () => void
  onCancel: () => void
}

export default function CustomerForm({ customer, authFetch, onSuccess, onCancel }: CustomerFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!customer

  const schema = isEditing ? customerUpdateSchema : customerCreateSchema

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: customer
      ? {
          name: customer.name,
          email: customer.email ?? undefined,
          phone: customer.phone ?? undefined,
          whatsappPhone: customer.whatsappPhone ?? undefined,
          cpfCnpj: customer.cpfCnpj ?? undefined,
          address: customer.address ?? undefined,
        }
      : undefined,
  })

  async function onSubmit(values: CustomerCreateInput | CustomerUpdateInput) {
    setServerError(null)

    try {
      const url = isEditing ? `/api/clientes/${customer!.id}` : '/api/clientes'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setServerError(json.error ?? 'Erro ao salvar cliente')
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
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nome <span className="text-red-500">*</span>
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
          <label htmlFor="cpfCnpj" className="block text-sm font-medium text-gray-700">
            CPF/CNPJ
          </label>
          <input
            id="cpfCnpj"
            type="text"
            {...register('cpfCnpj')}
            placeholder="Apenas números (11 ou 14 dígitos)"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.cpfCnpj && <p className="mt-1 text-xs text-red-600">{errors.cpfCnpj.message}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Telefone
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

        <div>
          <label htmlFor="whatsappPhone" className="block text-sm font-medium text-gray-700">
            WhatsApp
          </label>
          <input
            id="whatsappPhone"
            type="tel"
            {...register('whatsappPhone')}
            placeholder="(11) 99999-9999"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.whatsappPhone && <p className="mt-1 text-xs text-red-600">{errors.whatsappPhone.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Endereço
          </label>
          <input
            id="address"
            type="text"
            {...register('address')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
        </div>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

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
          {isSubmitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar cliente'}
        </button>
      </div>
    </form>
  )
}
