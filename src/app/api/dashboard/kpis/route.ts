import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api-error'
import { ok } from '@/lib/utils'
import { getDashboardKPIs } from '@/server/queries/dashboard'

export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const kpis = await getDashboardKPIs(tenantId)
    return ok(kpis)
  })()
}
