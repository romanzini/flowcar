'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/components/shared/SessionProvider'

interface Customer {
  id: string
  name: string
}

interface Vehicle {
  id: string
  plate: string
  brand: string
  model: string
  customerId: string
}

interface ServiceType {
  id: string
  name: string
  estimatedMinutes: number
}

interface QuoteItemFormState {
  serviceTypeId: string
  description: string
  quantity: string
  unitPrice: string
  discountAmount: string
}

interface QuoteResult {
  id: string
  number: string
  status: string
}

interface Props {
  onSuccess: (quote: QuoteResult) => void
  onCancel: () => void
}

const emptyItem = (): QuoteItemFormState => ({
  serviceTypeId: '',
  description: '',
  quantity: '1',
  unitPrice: '0',
  discountAmount: '0',
})

export default function QuoteForm({ onSuccess, onCancel }: Props) {
  const { authFetch } = useSession()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])

  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [items, setItems] = useState<QuoteItemFormState[]>([emptyItem()])

  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Load reference data
  useEffect(() => {
    const load = async () => {
      try {
        const [custRes, stRes] = await Promise.all([
          authFetch('/api/clientes'),
          authFetch('/api/tipos-servico'),
        ])
        const [custJson, stJson] = await Promise.all([custRes.json(), stRes.json()])
        if (custJson.success) setCustomers(custJson.data)
        if (stJson.success) setServiceTypes(stJson.data)
      } catch { /* ignore */ }
    }
    void load()
  }, [authFetch])

  // Load vehicles when customer changes
  useEffect(() => {
    if (!customerId) {
      setVehicles([])
      setVehicleId('')
      return
    }
    const load = async () => {
      try {
        const res = await authFetch(`/api/veiculos?customerId=${customerId}`)
        const json = await res.json()
        if (json.success) setVehicles(json.data)
      } catch { /* ignore */ }
    }
    void load()
  }, [authFetch, customerId])

  const updateItem = (index: number, field: keyof QuoteItemFormState, value: string) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }

      // Auto-fill description from service type
      if (field === 'serviceTypeId' && value) {
        const st = serviceTypes.find((s) => s.id === value)
        if (st) {
          next[index].description = st.name
        }
      }
      return next
    })
  }

  const addItem = () => setItems((prev) => [...prev, emptyItem()])
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index))

  const calcItemSubtotal = (item: QuoteItemFormState): number => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unitPrice) || 0
    const discount = parseFloat(item.discountAmount) || 0
    return qty * price - discount
  }

  const total = items.reduce((sum, item) => sum + calcItemSubtotal(item), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!customerId) { setServerError('Selecione um cliente'); return }
    if (!validUntil) { setServerError('Informe a data de validade'); return }
    if (items.some((i) => !i.description)) { setServerError('Preencha a descrição de todos os itens'); return }

    setSubmitting(true)
    try {
      const res = await authFetch('/api/orcamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          vehicleId: vehicleId || undefined,
          validUntil,
          items: items.map((item) => ({
            serviceTypeId: item.serviceTypeId || undefined,
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
            discountAmount: parseFloat(item.discountAmount) || 0,
          })),
        }),
      })
      const json = await res.json()
      if (json.success) {
        onSuccess(json.data)
      } else {
        setServerError(json.error ?? 'Erro ao criar orçamento')
      }
    } catch {
      setServerError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Customer & Vehicle */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente <span className="text-red-500">*</span>
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          >
            <option value="">Selecione um cliente...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Veículo</label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            disabled={!customerId}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
          >
            <option value="">Selecione um veículo...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Valid until */}
      <div className="max-w-xs">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Válido até <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Itens</h3>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-blue-600 hover:underline"
          >
            + Adicionar item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-md border border-gray-200 p-3 bg-gray-50">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 mb-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Serviço</label>
                  <select
                    value={item.serviceTypeId}
                    onChange={(e) => updateItem(i, 'serviceTypeId', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Sem tipo de serviço</option>
                    {serviceTypes.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    placeholder="Descrição do item"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Preço Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.discountAmount}
                    onChange={(e) => updateItem(i, 'discountAmount', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Subtotal: <strong>R$ {calcItemSubtotal(item).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-3 text-right">
          <span className="text-sm text-gray-600">Total do Orçamento: </span>
          <span className="text-lg font-bold text-blue-600">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t">
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
          {submitting ? 'Salvando...' : 'Criar Orçamento'}
        </button>
      </div>
    </form>
  )
}
