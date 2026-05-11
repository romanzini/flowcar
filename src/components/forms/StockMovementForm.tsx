'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { stockMovementCreateSchema } from '@/lib/validations/stock-movement'

type FormValues = z.infer<typeof stockMovementCreateSchema>

interface StockMovement {
  id: string
  type: string
  quantity: string | number
  reason: string | null
  createdAt: string
}

interface Props {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
  productId: string
  productName: string
  onSuccess: (movement: StockMovement) => void
  onCancel: () => void
}

export default function StockMovementForm({
  authFetch,
  productId,
  productName,
  onSuccess,
  onCancel,
}: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(stockMovementCreateSchema) as never,
    defaultValues: { type: 'ENTRADA', quantity: 1 },
  })

  const movementType = watch('type')

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true)
    setServerError(null)
    try {
      const res = await authFetch(`/api/inventario/${productId}/movimentacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        onSuccess(json.data)
      } else {
        setServerError(json.error ?? 'Erro ao registrar movimentação')
      }
    } catch {
      setServerError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  const typeLabels: Record<string, string> = {
    ENTRADA: 'Entrada',
    SAIDA: 'Saída',
    AJUSTE: 'Ajuste',
  }

  const typeColors: Record<string, string> = {
    ENTRADA: 'border-green-500',
    SAIDA: 'border-red-500',
    AJUSTE: 'border-yellow-500',
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <p className="text-sm text-gray-600">
        Produto: <span className="font-medium">{productName}</span>
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {(['ENTRADA', 'SAIDA', 'AJUSTE'] as const).map((t) => (
            <label
              key={t}
              className={`flex-1 cursor-pointer rounded-md border-2 px-3 py-2 text-center text-sm font-medium transition-colors ${
                movementType === t
                  ? `${typeColors[t]} bg-gray-50`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value={t}
                {...register('type')}
                className="sr-only"
              />
              {typeLabels[t]}
            </label>
          ))}
        </div>
        {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quantidade <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          step="0.001"
          {...register('quantity')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
      </div>

      {movementType === 'ENTRADA' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custo unitário (R$)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('unitCost')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Motivo / Observação
        </label>
        <input
          {...register('reason')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Ex: Compra fornecedor X, uso em OS-042…"
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
          className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
            movementType === 'ENTRADA'
              ? 'bg-green-600 hover:bg-green-700'
              : movementType === 'SAIDA'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-yellow-600 hover:bg-yellow-700'
          }`}
        >
          {submitting ? 'Registrando…' : 'Registrar Movimentação'}
        </button>
      </div>
    </form>
  )
}
