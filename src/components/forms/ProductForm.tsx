'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { productCreateSchema, productUpdateSchema } from '@/lib/validations/product'

type CreateValues = z.infer<typeof productCreateSchema>
type UpdateValues = z.infer<typeof productUpdateSchema>

interface Product {
  id: string
  name: string
  unit: string
  currentStock: string | number
  minimumStock: string | number
  costPrice: string | number
}

interface Props {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
  existing?: Product
  onSuccess: (product: Product) => void
  onCancel: () => void
}

export default function ProductForm({ authFetch, existing, onSuccess, onCancel }: Props) {
  const isEdit = Boolean(existing)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = isEdit ? productUpdateSchema : productCreateSchema
  const { register, handleSubmit, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: existing
      ? {
          name: existing.name,
          unit: existing.unit,
          minimumStock: Number(existing.minimumStock),
          costPrice: Number(existing.costPrice),
        }
      : { currentStock: 0, minimumStock: 0, costPrice: 0 },
  })

  const onSubmit = async (data: CreateValues | UpdateValues) => {
    setSubmitting(true)
    setServerError(null)
    try {
      const url = existing ? `/api/inventario/${existing.id}` : '/api/inventario'
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
        setServerError(json.error ?? 'Erro ao salvar produto')
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
          placeholder="Ex: Cera automotiva"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Unidade <span className="text-red-500">*</span>
        </label>
        <input
          {...register('unit')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Ex: un, L, kg"
        />
        {errors.unit && <p className="mt-1 text-xs text-red-600">{errors.unit.message}</p>}
      </div>

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estoque inicial
          </label>
          <input
            type="number"
            step="0.001"
            {...register('currentStock')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estoque mínimo
        </label>
        <input
          type="number"
          step="0.001"
          {...register('minimumStock')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Custo unitário (R$)
        </label>
        <input
          type="number"
          step="0.01"
          {...register('costPrice')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
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
          {submitting ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar Produto'}
        </button>
      </div>
    </form>
  )
}
