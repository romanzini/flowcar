'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/shared/SessionProvider'
import Sidebar from '@/components/shared/Sidebar'
import type { TokenResponse } from '@/lib/validations/auth'

export default function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, accessToken, setSession } = useSession()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const token = accessToken ?? sessionStorage.getItem('access_token')
    if (token) {
      setIsReady(true)
      return
    }

    // No access token in memory — attempt silent refresh via HttpOnly refresh_token cookie
    fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh failed')
        const json = (await res.json()) as { success: boolean; data?: TokenResponse }
        const tokenData = json.data

        if (!tokenData?.accessToken || !tokenData.user) {
          throw new Error('invalid refresh response')
        }

        setSession(tokenData.accessToken, tokenData.user)
        setIsReady(true)
      })
      .catch(() => {
        router.replace('/login')
      })
  }, [accessToken, router, setSession])

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
