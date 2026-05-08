import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import LoginForm from '@/components/forms/LoginForm'

export default async function LoginPage() {
  // Check for existing valid session via access token stored client-side is not possible here,
  // but we can check if the middleware forwarded the user header — if authenticated, redirect
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value

  if (refreshToken) {
    // Attempt to redirect to dashboard — middleware will handle invalid tokens
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">FlowCar</h1>
          <p className="mt-2 text-gray-600">Entre na sua conta</p>
        </div>
        <div className="rounded-lg bg-white p-8 shadow">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
