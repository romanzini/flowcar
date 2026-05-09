'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { serviceTypeCreateSchema, serviceTypeUpdateSchema } from '@/lib/validations/settings'

type CreateValues = z.infer<typeof serviceTypeCreateSchema>
type UpdateValues = z.infer<typeof serviceTypeUpdateSchema>

interface ServiceType {
  id: string
  name: string
  basePrice: string | number
  estimatedMinutes: number
  isActive: boolean
}

interface Props {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
  existing?: ServiceType
  onSuccess: (serviceType: ServiceType) => void
  onCancel: () => void
}

export default function ServiceTypeForm({ authFetch, existing, onSuccess, onCancel }: Props) {
  const isEdit = Boolean(existing)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = isEdit ? serviceTypeUpdateSchema : serviceTypeCreateSchema
  const { register, handleSubmit, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: existing
      ? {
          name: existing.name,
          basePrice: Number(existing.basePrice),
          estimatedMinutes: existing.estimatedMinutes,
        }
      : { basePrice: 0, estimatedMinutes: 30 },
  })

  const onSubmit = async (data: CreateValues | UpdateValues) => {
    setSubmitting(true)
    setServerError(null)
    try {
      const url = existing
        ? `/api/configuracoes/tipos-servico/${existing.id}`
        : '/api/configuracoes/tipos-servico'
      const method = existing ? 'PATCH' : 'POST'
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        onSuccess(json.data)
      } else {
        setServerError(json.error ?? 'Erro ao salvar tipo de serviço')
      }
    } catch {
      setServerError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Ex: Lavagem completa"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Preço base (R$) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          {...register('basePrice')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="0,00"
        />
        {errors.basePrice && (
          <p className="mt-1 text-xs text-red-600">{errors.basePrice.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tempo estimado (minutos) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="1"
          {...register('estimatedMinutes')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="30"
        />
        {errors.estimatedMinutes && (
          <p className="mt-1 text-xs text-red-600">{errors.estimatedMinutes.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar Tipo'}
        </button>
      </div>
    </form>
  )
}
