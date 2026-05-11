import { NextRequest } from 'next/server'
import { tenantRegistrationSchema } from '@/lib/validations/tenant'
import { createTenant } from '@/server/services/tenant.service'
import { withErrorHandler, TooManyRequestsError, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const body = await req.json()

  return withErrorHandler(async () => {
    // SEC-004: Rate limit — max 10 registrations per IP per hour
    const { allowed } = await checkRegistrationRateLimit(ip)
    if (!allowed) {
      throw new TooManyRequestsError('Limite de cadastros atingido. Tente novamente mais tarde.')
    }

    const parsed = tenantRegistrationSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const result = await createTenant(parsed.data)

    return ok(result, 201)
  })()
}

// Registration rate limit: max 10 per IP per hour
async function checkRegistrationRateLimit(ip: string) {
  const { redis } = await import('@/lib/auth/redis')
  const key = `reg:attempts:${ip}`
  const window = 60 * 60 // 1 hour
  const limit = 10

  const now = Date.now()
  const windowStart = now - window * 1000

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, '-inf', windowStart)
  pipeline.zadd(key, now, `${now}-${Math.random()}`)
  pipeline.zcard(key)
  pipeline.expire(key, window)

  const results = await pipeline.exec()
  const count = (results?.[2]?.[1] as number) ?? 0

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  }
}