'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  vehicleCreateSchema,
  vehicleUpdateSchema,
  type VehicleCreateInput,
  type VehicleUpdateInput,
} from '@/lib/validations/vehicle'

interface Vehicle {
  id: string
  plate: string
  brand: string | null
  model: string | null
  year: number | null
  color: string | null
}

interface VehicleFormProps {
  vehicle?: Vehicle | null
  customerId: string
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>
  onSuccess: () => void
  onCancel: () => void
}

export default function VehicleForm({ vehicle, customerId, authFetch, onSuccess, onCancel }: VehicleFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!vehicle

  const schema = isEditing ? vehicleUpdateSchema : vehicleCreateSchema

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VehicleCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: vehicle
      ? {
          plate: vehicle.plate,
          brand: vehicle.brand ?? undefined,
          model: vehicle.model ?? undefined,
          year: vehicle.year ?? undefined,
          color: vehicle.color ?? undefined,
          customerId,
        }
      : { customerId },
  })

  async function onSubmit(values: VehicleCreateInput | VehicleUpdateInput) {
    setServerError(null)

    try {
      const url = isEditing ? `/api/veiculos/${vehicle!.id}` : '/api/veiculos'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setServerError(json.error ?? 'Erro ao salvar veículo')
        return
      }

      onSuccess()
    } catch {
      setServerError('Erro de conexão. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('customerId')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="plate" className="block text-sm font-medium text-gray-700">
            Placa <span className="text-red-500">*</span>
          </label>
          <input
            id="plate"
            type="text"
            {...register('plate')}
            placeholder="ABC1234"
            onChange={(e) => setValue('plate', e.target.value.toUpperCase())}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.plate && <p className="mt-1 text-xs text-red-600">{errors.plate.message}</p>}
        </div>

        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
            Marca
          </label>
          <input
            id="brand"
            type="text"
            {...register('brand')}
            placeholder="Toyota"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.brand && <p className="mt-1 text-xs text-red-600">{errors.brand.message}</p>}
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700">
            Modelo
          </label>
          <input
            id="model"
            type="text"
            {...register('model')}
            placeholder="Corolla"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.model && <p className="mt-1 text-xs text-red-600">{errors.model.message}</p>}
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700">
            Ano
          </label>
          <input
            id="year"
            type="number"
            {...register('year', { valueAsNumber: true })}
            placeholder="2024"
            min={1900}
            max={new Date().getFullYear() + 1}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.year && <p className="mt-1 text-xs text-red-600">{errors.year.message}</p>}
        </div>

        <div>
          <label htmlFor="color" className="block text-sm font-medium text-gray-700">
            Cor
          </label>
          <input
            id="color"
            type="text"
            {...register('color')}
            placeholder="Branco"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.color && <p className="mt-1 text-xs text-red-600">{errors.color.message}</p>}
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
          {isSubmitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Adicionar veículo'}
        </button>
      </div>
    </form>
  )
}
