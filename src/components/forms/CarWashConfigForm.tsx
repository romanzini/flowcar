'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { carWashConfigUpdateSchema } from '@/lib/validations/settings'

type ConfigValues = z.infer<typeof carWashConfigUpdateSchema>

interface CarWashConfig {
  businessName: string
  slug: string
  config: {
    simultaneousSlots: number
    phone: string | null
    address: string | null
    logoFileId: string | null
  } | null
}

interface Props {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
  existing: CarWashConfig
  onSuccess: () => void
}

export default function CarWashConfigForm({ authFetch, existing, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<ConfigValues>({
    resolver: zodResolver(carWashConfigUpdateSchema),
    defaultValues: {
      businessName: existing.businessName,
      slug: existing.slug,
      simultaneousSlots: existing.config?.simultaneousSlots ?? 1,
      phone: existing.config?.phone ?? undefined,
      address: existing.config?.address ?? undefined,
    },
  })

  const onSubmit = async (data: ConfigValues) => {
    setSubmitting(true)
    setServerError(null)
    setSuccessMsg(null)
    try {
      const res = await authFetch('/api/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        setSuccessMsg('Configurações salvas com sucesso!')
        onSuccess()
      } else {
        setServerError(json.error ?? 'Erro ao salvar configurações')
      }
    } catch {
      setServerError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    setLogoError(null)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const res = await authFetch('/api/configuracoes', {
        method: 'PATCH',
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        setSuccessMsg('Logotipo atualizado com sucesso!')
        onSuccess()
      } else {
        setLogoError(json.error ?? 'Erro ao fazer upload do logotipo')
      }
    } catch {
      setLogoError('Erro de conexão')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}
      {successMsg && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do estabelecimento <span className="text-red-500">*</span>
        </label>
        <input
          {...register('businessName')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Ex: Lava-Jato do João"
        />
        {errors.businessName && (
          <p className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Slug (URL pública) <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">/fila/</span>
          <input
            {...register('slug')}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="meu-lava-jato"
          />
        </div>
        {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
        <p className="mt-1 text-xs text-gray-500">
          Apenas letras minúsculas, números e hífens. Ex: lavajato-central
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vagas simultâneas <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="1"
          {...register('simultaneousSlots')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {errors.simultaneousSlots && (
          <p className="mt-1 text-xs text-red-600">{errors.simultaneousSlots.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Quantos veículos podem ser atendidos simultaneamente
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
        <input
          {...register('phone')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="(11) 99999-9999"
        />
        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
        <input
          {...register('address')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Rua Example, 123 — Bairro — Cidade/UF"
        />
        {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
      </div>

      {/* Logo upload section */}
      <div className="rounded-md border border-gray-200 p-4 bg-gray-50">
        <label className="block text-sm font-medium text-gray-700 mb-2">Logotipo</label>
        {existing.config?.logoFileId && (
          <p className="text-xs text-green-600 mb-2">✓ Logotipo atual configurado</p>
        )}
        {logoError && (
          <p className="text-xs text-red-600 mb-2">{logoError}</p>
        )}
        <div className="flex items-center gap-3">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleLogoUpload}
            className="hidden"
            id="logo-upload"
          />
          <label
            htmlFor="logo-upload"
            className={`cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 ${
              uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploadingLogo ? 'Enviando…' : 'Selecionar imagem'}
          </label>
          <span className="text-xs text-gray-500">JPG, PNG ou WEBP • máx 10 MB</span>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>
    </form>
  )
}
