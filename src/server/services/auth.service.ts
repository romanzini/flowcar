import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { signAccessToken } from '@/lib/auth/jwt'
import {
  checkLoginRateLimit,
  storeRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
} from '@/lib/auth/redis'
import { logLoginSuccess, logLoginFailure } from '@/lib/logging/logger'
import { UnauthorizedError, TooManyRequestsError } from '@/lib/api-error'
import type { LoginRequest, TokenResponse } from '@/lib/validations/auth'

export async function login(input: LoginRequest, ip: string): Promise<{
  token: TokenResponse
  refreshTokenId: string
}> {
  const { allowed } = await checkLoginRateLimit(ip)
  if (!allowed) {
    throw new TooManyRequestsError('Muitas tentativas de login. Tente novamente em 15 minutos.')
  }

  // Constant-time check: look up user first, then compare password
  // This avoids timing differences that reveal whether the email exists
  const user = await prisma.user.findFirst({
    where: { email: input.email, isActive: true },
    select: {
      id: true,
      tenantId: true,
      name: true,
      email: true,
      role: true,
      passwordHash: true,
    },
  })

  const DUMMY_HASH = '$2b$12$invalidhashforstabletimingXXXXXXXXXXXXXXXXX'
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH

  const passwordMatch = await bcrypt.compare(input.password, hashToCompare)

  if (!user || !passwordMatch) {
    logLoginFailure(input.email, ip)
    throw new UnauthorizedError('Credenciais inválidas.')
  }

  const payload = {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  }

  const accessToken = await signAccessToken(payload)
  const refreshTokenId = randomUUID()

  await storeRefreshToken(refreshTokenId, user.id, user.tenantId)

  logLoginSuccess(user.id, user.tenantId)

  return {
    token: {
      accessToken,
      expiresIn: 15 * 60,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    },
    refreshTokenId,
  }
}

export async function logout(refreshTokenId: string): Promise<void> {
  const stored = await getRefreshToken(refreshTokenId)
  if (!stored) return
  await revokeRefreshToken(refreshTokenId, stored.userId)
}

export async function hasValidRefreshSession(refreshTokenId: string): Promise<boolean> {
  try {
    const stored = await getRefreshToken(refreshTokenId)
    if (!stored) {
      return false
    }

    const user = await prisma.user.findFirst({
      where: { id: stored.userId, tenantId: stored.tenantId, isActive: true },
      select: { id: true },
    })

    if (!user) {
      await revokeRefreshToken(refreshTokenId, stored.userId)
      return false
    }

    return true
  } catch {
    return false
  }
}

export async function refreshToken(refreshTokenId: string): Promise<{
  token: TokenResponse
  newRefreshTokenId: string
}> {
  const stored = await getRefreshToken(refreshTokenId)
  if (!stored) {
    throw new UnauthorizedError('Sessão inválida ou expirada. Faça login novamente.')
  }

  const user = await prisma.user.findFirst({
    where: { id: stored.userId, tenantId: stored.tenantId, isActive: true },
    select: { id: true, tenantId: true, name: true, email: true, role: true },
  })

  if (!user) {
    await revokeRefreshToken(refreshTokenId, stored.userId)
    throw new UnauthorizedError('Usuário não encontrado ou desativado.')
  }

  // Rotate: revoke old, issue new
  await revokeRefreshToken(refreshTokenId, stored.userId)
  const newRefreshTokenId = randomUUID()
  await storeRefreshToken(newRefreshTokenId, user.id, user.tenantId)

  const accessToken = await signAccessToken({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  })

  return {
    token: {
      accessToken,
      expiresIn: 15 * 60,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    },
    newRefreshTokenId,
  }
}
