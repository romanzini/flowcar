import { NextRequest } from 'next/server'
import { loginRequestSchema } from '@/lib/validations/auth'
import { login } from '@/server/services/auth.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const body = await req.json()

  return withErrorHandler(async () => {
    const parsed = loginRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const { token, refreshTokenId } = await login(parsed.data, ip)

    const response = ok(token)

    // SEC-005: HttpOnly; Secure; SameSite=Strict; Path=/api/auth
    response.cookies.set('refresh_token', refreshTokenId, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    })

    return response
  })()
}
