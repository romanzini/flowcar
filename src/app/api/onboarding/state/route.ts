import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api-error'
import { ok } from '@/lib/utils'
import { getOnboardingState } from '@/server/queries/onboarding'

export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const state = await getOnboardingState(tenantId)
    return ok(state)
  })()
}
