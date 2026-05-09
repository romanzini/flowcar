import { NextRequest } from 'next/server'
import { convertToOS } from '@/server/services/quote.service'
import { withErrorHandler } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const { id } = await params

    const result = await convertToOS(id, tenantId)

    if (result.alreadyConverted) {
      return ok(
        {
          alreadyConverted: true,
          serviceOrder: result.serviceOrder,
          message: `Orçamento já foi convertido na OS ${result.serviceOrder?.number}`,
        },
        200
      )
    }

    return ok({ alreadyConverted: false, serviceOrder: result.serviceOrder }, 201)
  })()
}
