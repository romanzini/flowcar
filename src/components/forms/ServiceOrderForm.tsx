'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const formSchema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  vehicleId: z.string().min(1, 'Veículo é obrigatório'),
  responsibleUserId: z.string().optional(),
  items: z.array(
    z.object({
      kind: z.enum(['SERVICO', 'PRODUTO']),
      serviceTypeId: z.string().optional(),
      productId: z.string().optional(),
      description: z.string().min(1, 'Descrição é obrigatória'),
      quantity: z.coerce.number().positive('Deve ser maior que zero'),
      unitPrice: z.coerce.number().min(0, 'Deve ser >= 0'),
      discountAmount: z.coerce.number().min(0).optional(),
    })
  ).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Customer { id: string; name: string }
interface Vehicle { id: string; plate: string; brand: string | null; model: string | null }
interface ServiceType { id: string; name: string; basePrice: string; estimatedMinutes: number }

interface ServiceOrder {
  id: string
  number: string
  status: string
}

interface Props {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
  onSuccess: (os: ServiceOrder) => void
  onCancel: () => void
}

export default function ServiceOrderForm({ authFetch, onSuccess, onCancel }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: { items: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const selectedCustomerId = watch('customerId')

  const fetchCustomers = useCallback(async (search: string) => {
    if (!search || search.length < 2) { setCustomers([]); return }
    try {
      const res = await authFetch(`/api/clientes?search=${encodeURIComponent(search)}`)
      const json = await res.json()
      if (json.success) setCustomers(json.data)
    } catch { /* ignore */ }
  }, [authFetch])

  useEffect(() => {
    const t = setTimeout(() => void fetchCustomers(customerSearch), 300)
    return () => clearTimeout(t)
  }, [customerSearch, fetchCustomers])

  useEffect(() => {
    if (!selectedCustomerId) { setVehicles([]); return }
    void (async () => {
      try {
        const res = await authFetch(`/api/veiculos?customerId=${selectedCustomerId}`)
        const json = await res.json()
        if (json.success) setVehicles(json.data.filter((v: Vehicle & { isActive: boolean }) => v.isActive))
      } catch { /* ignore */ }
    })()
  }, [selectedCustomerId, authFetch])

  useEffect(() => {
    void (async () => {
      try {
        const res = await authFetch('/api/tipos-servico')
        const json = await res.json()
        if (json.success) setServiceTypes(json.data.filter((s: ServiceType & { isActive: boolean }) => s.isActive))
      } catch { /* ignore */ }
    })()
  }, [authFetch])

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true)
    setServerError(null)
    try {
      // 1. Create the OS
      const osRes = await authFetch('/api/ordens-servico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          responsibleUserId: data.responsibleUserId || undefined,
        }),
      })
      const osJson = await osRes.json()
      if (!osJson.success) {
        setServerError(osJson.error ?? 'Erro ao criar OS')
        return
      }

      const createdOS: ServiceOrder = osJson.data

      // 2. Add items if any
      for (const item of data.items ?? []) {
        await authFetch(`/api/ordens-servico/${createdOS.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })
      }

      onSuccess(createdOS)
    } catch {
      setServerError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  const addItem = (kind: 'SERVICO' | 'PRODUTO') => {
    append({ kind, description: '', quantity: 1, unitPrice: 0, discountAmount: 0 })
  }

  const watchedItems = watch('items') ?? []
  const total = watchedItems.reduce((sum, item) => {
    const gross = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    return sum + gross - (Number(item.discountAmount) || 0)
  }, 0)

  return (
    <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-6">
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Customer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cliente <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          placeholder="Digite o nome do cliente…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {customers.length > 0 && (
          <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm">
            {customers.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setValue('customerId', c.id)
                    setValue('vehicleId', '')
                    setCustomerSearch(c.name)
                    setCustomers([])
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <input type="hidden" {...register('customerId')} />
        {errors.customerId && (
          <p className="mt-1 text-xs text-red-600">{errors.customerId.message}</p>
        )}
      </div>

      {/* Vehicle */}
      {selectedCustomerId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Veículo <span className="text-red-500">*</span>
          </label>
          {vehicles.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum veículo ativo para este cliente</p>
          ) : (
            <select
              {...register('vehicleId')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecione um veículo</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} {v.brand && v.model ? `— ${v.brand} ${v.model}` : ''}
                </option>
              ))}
            </select>
          )}
          {errors.vehicleId && (
            <p className="mt-1 text-xs text-red-600">{errors.vehicleId.message}</p>
          )}
        </div>
      )}

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Itens</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addItem('SERVICO')}
              className="rounded px-2 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200"
            >
              + Serviço
            </button>
            <button
              type="button"
              onClick={() => addItem('PRODUTO')}
              className="rounded px-2 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200"
            >
              + Produto
            </button>
          </div>
        </div>

        {fields.length > 0 && (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-md border border-gray-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    field.kind === 'SERVICO' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {field.kind === 'SERVICO' ? 'Serviço' : 'Produto'}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                </div>

                {field.kind === 'SERVICO' && serviceTypes.length > 0 && (
                  <select
                    {...register(`items.${index}.serviceTypeId`)}
                    onChange={(e) => {
                      const st = serviceTypes.find((s) => s.id === e.target.value)
                      if (st) {
                        setValue(`items.${index}.serviceTypeId`, st.id)
                        setValue(`items.${index}.description`, st.name)
                        setValue(`items.${index}.unitPrice`, Number(st.basePrice))
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
                  >
                    <option value="">Selecionar tipo de serviço…</option>
                    {serviceTypes.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                )}

                <input
                  {...register(`items.${index}.description`)}
                  placeholder="Descrição"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
                />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Qtd</label>
                    <input
                      type="number"
                      step="0.001"
                      {...register(`items.${index}.quantity`)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Preço unit. (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.unitPrice`)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Desconto (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.discountAmount`)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="text-right text-sm font-semibold text-gray-900">
              Total: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
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
          {submitting ? 'Criando…' : 'Criar OS'}
        </button>
      </div>
    </form>
  )
}
