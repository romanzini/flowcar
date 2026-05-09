'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from '@/components/shared/SessionProvider'
import {
  contractCreateSchema,
  contractUpdateSchema,
  type ContractCreateInput,
  type ContractUpdateInput,
} from '@/lib/validations/contract'

interface CustomerOption {
  id: string
  name: string
}

interface ContractFormData {
  id: string
  customerId: string
  title: string
  contentHtml: string
  customer?: { id: string; name: string }
}

interface ContractFormProps {
  contract?: ContractFormData | null
  onSuccess: (contract: { id: string; number?: string; title: string; customerId: string; contentHtml: string }) => void
  onCancel: () => void
}

export default function ContractForm({ contract, onSuccess, onCancel }: ContractFormProps) {
  const { authFetch } = useSession()
  const [serverError, setServerError] = useState<string | null>(null)
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [customerSearch, setCustomerSearch] = useState(contract?.customer?.name ?? '')
  const isEditing = Boolean(contract)

  const resolverSchema = useMemo(() => (isEditing ? contractUpdateSchema : contractCreateSchema), [isEditing])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContractCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(resolverSchema as any),
    defaultValues: contract
      ? {
          customerId: contract.customerId,
          title: contract.title,
          contentHtml: contract.contentHtml,
        }
      : undefined,
  })

  const selectedCustomerId = watch('customerId')

  useEffect(() => {
    if (contract?.customer?.id && contract.customer.name) {
      setCustomerOptions([{ id: contract.customer.id, name: contract.customer.name }])
    }
  }, [contract])

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const query = customerSearch.trim()
        const res = await authFetch(`/api/clientes?search=${encodeURIComponent(query)}`)
        const json = await res.json()
        if (json.success) {
          setCustomerOptions(json.data)
        }
      } catch {
        // ignore search errors during typing
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [authFetch, customerSearch])

  const selectedCustomer = customerOptions.find((customer) => customer.id === selectedCustomerId)

  async function onSubmit(values: ContractCreateInput | ContractUpdateInput) {
    setServerError(null)

    try {
      const url = isEditing ? `/api/contratos/${contract!.id}` : '/api/contratos'
      const method = isEditing ? 'PATCH' : 'POST'
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        setServerError(json.error ?? 'Erro ao salvar contrato')
        return
      }

      onSuccess(json.data)
    } catch {
      setServerError('Erro de conexão. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Buscar cliente <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={customerSearch}
          onChange={(event) => setCustomerSearch(event.target.value)}
          placeholder="Digite o nome do cliente"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={selectedCustomerId ?? ''}
          onChange={(event) => setValue('customerId', event.target.value, { shouldValidate: true })}
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione um cliente...</option>
          {customerOptions.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        {selectedCustomer && <p className="mt-1 text-xs text-gray-500">Selecionado: {selectedCustomer.name}</p>}
        {errors.customerId && <p className="mt-1 text-xs text-red-600">{errors.customerId.message}</p>}
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          {...register('title')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="contentHtml" className="block text-sm font-medium text-gray-700">
          Conteúdo HTML <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contentHtml"
          rows={14}
          {...register('contentHtml')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="<p>Descreva aqui as cláusulas do contrato...</p>"
        />
        <p className="mt-1 text-xs text-gray-500">
          Tags básicas como p, strong, em, ul e table serão preservadas na visualização e no PDF.
        </p>
        {errors.contentHtml && <p className="mt-1 text-xs text-red-600">{errors.contentHtml.message}</p>}
      </div>

      <div className="flex justify-end gap-3 border-t pt-2">
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
          {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar contrato'}
        </button>
      </div>
    </form>
  )
}
