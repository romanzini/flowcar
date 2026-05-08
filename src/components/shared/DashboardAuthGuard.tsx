'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/shared/SessionProvider'
import Sidebar from '@/components/shared/Sidebar'

export default function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useSession()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const token = accessToken ?? sessionStorage.getItem('access_token')
    if (!token) {
      router.replace('/login')
      return
    }
    setIsReady(true)
  }, [accessToken, router])

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Carregando…</p>
      </div>
    )
  }

  const userRole = user?.role ?? 'FUNCIONARIO'
  const userName = user?.name ?? 'Usuário'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar userRole={userRole} userName={userName} />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
