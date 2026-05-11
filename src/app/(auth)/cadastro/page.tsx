import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import RegisterForm from '@/components/forms/RegisterForm'
import { hasValidRefreshSession } from '@/server/services/auth.service'

export default async function CadastroPage() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value

  if (refreshToken && await hasValidRefreshSession(refreshToken)) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">FlowCar</h1>
          <p className="mt-2 text-gray-600">Cadastre seu lava-jato</p>
        </div>
        <div className="rounded-lg bg-white p-8 shadow">
          <RegisterForm />
        </div>
      </div>
    </main>
  )
}
