'use client'

import ServiceOrderForm from '@/components/forms/ServiceOrderForm'
import { useSession } from '@/components/shared/SessionProvider'
import { useRouter } from 'next/navigation'

export default function NovaOSPage() {
  const { authFetch } = useSession()
  const router = useRouter()

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar
        </button>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nova Ordem de Serviço</h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <ServiceOrderForm
          authFetch={authFetch}
          onSuccess={(os) => router.push(`/ordens-servico/${os.id}`)}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  )
}
