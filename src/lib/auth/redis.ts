import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// ─── Refresh token TTL (7 days in seconds) ────────────────────────────────────
const REFRESH_TTL = 7 * 24 * 60 * 60

// ─── Refresh token storage ────────────────────────────────────────────────────

export async function storeRefreshToken(
  tokenId: string,
  userId: string,
  tenantId: string
): Promise<void> {
  const key = `auth:refresh:${tokenId}`
  await redis.setex(key, REFRESH_TTL, JSON.stringify({ userId, tenantId, createdAt: Date.now() }))
  await redis.sadd(`auth:user:${userId}:tokens`, tokenId)
  await redis.expire(`auth:user:${userId}:tokens`, REFRESH_TTL)
}

export async function getRefreshToken(
  tokenId: string
): Promise<{ userId: string; tenantId: string } | null> {
  const raw = await redis.get(`auth:refresh:${tokenId}`)
  if (!raw) return null
  return JSON.parse(raw)
}

export async function revokeRefreshToken(tokenId: string, userId: string): Promise<void> {
  await redis.del(`auth:refresh:${tokenId}`)
  await redis.srem(`auth:user:${userId}:tokens`, tokenId)
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  const tokenIds = await redis.smembers(`auth:user:${userId}:tokens`)
  if (tokenIds.length > 0) {
    const pipeline = redis.pipeline()
    for (const id of tokenIds) {
      pipeline.del(`auth:refresh:${id}`)
    }
    pipeline.del(`auth:user:${userId}:tokens`)
    await pipeline.exec()
  }
}

// ─── Sliding-window rate limiting ─────────────────────────────────────────────

export async function checkLoginRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `auth:login:attempts:${ip}`
  const window = 15 * 60 // 15 minutes
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
