'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { tenantRegistrationSchema } from '@/lib/validations/tenant'
import { slugSchema } from '@/lib/validations/common'

const registerFormSchema = tenantRegistrationSchema
  .extend({
    confirmPassword: z.string().min(8),
    slug: slugSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerFormSchema>

export default function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
  })

  const slugValue = watch('slug')

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null)

    try {
      const { confirmPassword: _, ...payload } = values
      void _

      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setServerError(json.error ?? 'Erro ao cadastrar. Tente novamente.')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
    } catch {
      setServerError('Erro de conexão. Tente novamente.')
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="text-green-600 font-medium">Cadastro realizado com sucesso!</p>
        <p className="text-sm text-gray-500 mt-1">Redirecionando para o login…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
          Nome do estabelecimento
        </label>
        <input
          id="businessName"
          type="text"
          {...register('businessName')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.businessName && (
          <p className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
          Identificador único (slug)
        </label>
        <input
          id="slug"
          type="text"
          {...register('slug')}
          placeholder="meu-lava-jato"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {slugValue && (
          <p className="mt-1 text-xs text-gray-500">
            Sua fila pública: <span className="font-mono">/fila/{slugValue}</span>
          </p>
        )}
        {errors.slug && (
          <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700">
          Seu nome
        </label>
        <input
          id="ownerName"
          type="text"
          {...register('ownerName')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.ownerName && (
          <p className="mt-1 text-xs text-red-600">{errors.ownerName.message}</p>
        )}
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
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Senha
        </label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirmar senha
        </label>
        <input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-600 text-center">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Cadastrando…' : 'Criar conta'}
      </button>

      <p className="text-center text-sm text-gray-600">
        Já tem conta?{' '}
        <a href="/login" className="text-blue-600 hover:underline">
          Entrar
        </a>
      </p>
    </form>
  )
}
