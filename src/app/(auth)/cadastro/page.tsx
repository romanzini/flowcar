import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import RegisterForm from '@/components/forms/RegisterForm'

export default async function CadastroPage() {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token) {
    try {
      await verifyAccessToken(token)
      redirect('/dashboard')
    } catch {
      // Invalid token — continue to registration page
    }
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
