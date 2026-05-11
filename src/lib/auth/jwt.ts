import { SignJWT, jwtVerify } from 'jose'

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? 'fallback-secret-for-dev-only-32ch'
)

export interface JwtPayload {
  userId: string
  tenantId: string
  role: string
}

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(ACCESS_SECRET)
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET)

  if (
    typeof payload.userId !== 'string' ||
    typeof payload.tenantId !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    throw new Error('Invalid token payload')
  }

  return {
    userId: payload.userId as string,
    tenantId: payload.tenantId as string,
    role: payload.role as string,
  }
}
