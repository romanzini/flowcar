import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { SessionProvider } from '@/components/shared/SessionProvider'
import DashboardAuthGuard from '@/components/shared/DashboardAuthGuard'
import { hasValidRefreshSession } from '@/server/services/auth.service'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value

  if (!refreshToken || !(await hasValidRefreshSession(refreshToken))) {
    redirect('/login')
  }

  return (
    <SessionProvider>
      <DashboardAuthGuard>
        {children}
      </DashboardAuthGuard>
    </SessionProvider>
  )
}
