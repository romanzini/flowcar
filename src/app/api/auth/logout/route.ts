import { NextRequest } from 'next/server'
import { logout } from '@/server/services/auth.service'
import { withErrorHandler } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    const refreshTokenId = req.cookies.get('refresh_token')?.value

    if (refreshTokenId) {
      await logout(refreshTokenId)
    }

    const response = ok({ message: 'Sessão encerrada com sucesso.' })

    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 0,
    })

    return response
  })()
}
