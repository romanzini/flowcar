import { randomBytes } from 'crypto'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedis } from '@/lib/auth/redis'
import { uploadFile } from '@/lib/storage/upload'
import { getContractByToken, signContract } from '@/server/services/contract.service'
import { signatureSubmitSchema } from '@/lib/validations/contract'
import {
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnprocessableError,
  withErrorHandler,
} from '@/lib/api-error'
import { ok } from '@/lib/utils'

interface Params {
  params: Promise<{ token: string }>
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
}

function getClientIp(req: NextRequest): string {
  const trustedProxyIps = (process.env.TRUSTED_PROXY_IPS ?? '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean)

  const forwardedForHeader = req.headers.get('x-forwarded-for') ?? ''
  const forwardedForValues = forwardedForHeader
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean)

  const requestIp = req.headers.get('x-real-ip') ?? forwardedForValues[0] ?? ''

  if (requestIp && trustedProxyIps.includes(requestIp) && forwardedForValues.length > 0) {
    return forwardedForValues[forwardedForValues.length - 1] ?? ''
  }

  return forwardedForValues[0] ?? requestIp ?? ''
}

async function checkSigningRateLimit(rateLimitKey: string): Promise<RateLimitResult> {
  const redis = getRedis()
  const key = `csrf:sign:attempts:${rateLimitKey}`
  const window = 60 * 60
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

function parseSignatureBuffer(signatureDataUrl: string): Buffer {
  const [, base64] = signatureDataUrl.split(',', 2)
  if (!base64) {
    throw new UnprocessableError('Assinatura inválida')
  }

  return Buffer.from(base64, 'base64')
}

export async function GET(_req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { token } = await params
    if (token.length > 128) {
      throw new NotFoundError('Contrato não encontrado ou link expirado')
    }
    const contract = await getContractByToken(token)

    if (!contract) {
      throw new NotFoundError('Contrato não encontrado ou link expirado')
    }

    const csrfToken = randomBytes(16).toString('hex')
    const response = ok({ contract, csrfToken })
    response.cookies.set({
      name: 'csrf_token',
      value: csrfToken,
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      path: '/api/contratos/publico',
      maxAge: 1800,
    })

    return response
  })()
}

export async function POST(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const ip = getClientIp(req)
    const { token } = await params
    if (token.length > 128) {
      throw new NotFoundError('Contrato não encontrado ou link expirado')
    }

    const [ipRateLimit, tokenRateLimit] = await Promise.all([
      checkSigningRateLimit(ip),
      checkSigningRateLimit(token),
    ])

    if (!ipRateLimit.allowed || !tokenRateLimit.allowed) {
      throw new TooManyRequestsError('Limite de tentativas de assinatura excedido')
    }

    const csrfHeader = req.headers.get('x-csrf-token')
    const csrfCookie = req.cookies.get('csrf_token')?.value
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      throw new ForbiddenError('Token CSRF inválido')
    }

    const body = await req.json()
    const parsed = signatureSubmitSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Assinatura inválida')
    }

    const contract = await getContractByToken(token)
    if (!contract) {
      throw new UnprocessableError('Link de assinatura inválido ou expirado')
    }

    const buffer = parseSignatureBuffer(parsed.data.signatureDataUrl)
    const uploadResult = await uploadFile({
      tenantId: contract.tenantId,
      category: 'ASSINATURA_CONTRATO',
      buffer,
      mimeType: 'image/png',
      originalExtension: 'png',
    })

    const fileUpload = await prisma.fileUpload.create({
      data: {
        tenantId: contract.tenantId,
        category: 'ASSINATURA_CONTRATO',
        bucket: uploadResult.bucket,
        objectKey: uploadResult.objectKey,
        mimeType: 'image/png',
        sizeBytes: buffer.length,
        checksum: uploadResult.checksum,
        uploadedByUserId: null,
      },
      select: { id: true },
    })

    const signedContract = await signContract(
      token,
      fileUpload.id,
      ip,
      req.headers.get('user-agent') ?? undefined
    )

    const response = ok({
      id: signedContract.id,
      status: signedContract.status,
      signedAt: signedContract.signedAt,
    })

    response.cookies.set({
      name: 'csrf_token',
      value: '',
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      path: '/api/contratos/publico',
      maxAge: 0,
    })

    return response
  })()
}
