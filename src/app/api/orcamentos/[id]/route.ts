import { NextRequest } from 'next/server'
import { quoteUpdateSchema, quoteStatusTransitionSchema } from '@/lib/validations/quote'
import { getQuoteById, updateQuote, transitionQuoteStatus } from '@/server/services/quote.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const { id } = await params

    const quote = await getQuoteById(id, tenantId)
    return ok(quote)
  })()
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const { id } = await params

    // Check if this is a status transition
    if (body.status !== undefined && Object.keys(body).length === 1) {
      const parsed = quoteStatusTransitionSchema.safeParse(body)
      if (!parsed.success) {
        throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Status inválido')
      }
      const quote = await transitionQuoteStatus(id, tenantId, parsed.data)
      return ok(quote)
    }

    const parsed = quoteUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const quote = await updateQuote(id, tenantId, parsed.data)
    return ok(quote)
  })()
}
