import { NextRequest } from 'next/server'
import { refreshToken } from '@/server/services/auth.service'
import { withErrorHandler, UnauthorizedError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    const refreshTokenId = req.cookies.get('refresh_token')?.value
    if (!refreshTokenId) {
      throw new UnauthorizedError('Refresh token ausente.')
    }

    const { token, newRefreshTokenId } = await refreshToken(refreshTokenId)

    const response = ok(token)

    response.cookies.set('refresh_token', newRefreshTokenId, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    })

    return response
  })()
}
