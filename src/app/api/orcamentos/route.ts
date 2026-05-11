import { NextRequest } from 'next/server'
import { quoteCreateSchema } from '@/lib/validations/quote'
import { listQuotes, createQuote } from '@/server/services/quote.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const { searchParams } = req.nextUrl

    const quotes = await listQuotes(tenantId, {
      status: searchParams.get('status') ?? undefined,
      customerId: searchParams.get('customerId') ?? undefined,
    })

    return ok(quotes)
  })()
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = quoteCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const quote = await createQuote(tenantId, parsed.data)
    return ok(quote, 201)
  })()
}
