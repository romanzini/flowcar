import { NextRequest } from 'next/server'
import { getPublicQueue } from '@/server/queries/queue-public'
import { withErrorHandler, NotFoundError, TooManyRequestsError } from '@/lib/api-error'
import { ok } from '@/lib/utils'
import { getRedis } from '@/lib/auth/redis'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  return withErrorHandler(async () => {
    // SEC-004: Rate limit — max 60 requests per IP per minute
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    const allowed = await checkPublicQueueRateLimit(ip)
    if (!allowed) {
      throw new TooManyRequestsError('Limite de requisições atingido. Tente novamente em breve.')
    }

    const data = await getPublicQueue(slug)
    if (!data) {
      throw new NotFoundError('Lava-jato não encontrado.')
    }

    return ok(data)
  })()
}

async function checkPublicQueueRateLimit(ip: string): Promise<boolean> {
  const redis = getRedis()
  const key = `public-queue:requests:${ip}`
  const window = 60 // 1 minute
  const limit = 60

  const now = Date.now()
  const windowStart = now - window * 1000

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, '-inf', windowStart)
  pipeline.zadd(key, now, `${now}-${Math.random()}`)
  pipeline.zcard(key)
  pipeline.expire(key, window)

  const results = await pipeline.exec()
  const count = (results?.[2]?.[1] as number) ?? 0

  return count <= limit
}
