import { NextRequest } from 'next/server'
import { withErrorHandler, UnprocessableError, ForbiddenError } from '@/lib/api-error'
import { ok } from '@/lib/utils'
import {
  getRevenueReport,
  getTopServices,
  getTopCustomers,
  getStockMovementsReport,
} from '@/server/queries/reports'

const VALID_TYPES = ['revenue', 'services', 'customers', 'stock'] as const
type ReportType = (typeof VALID_TYPES)[number]

interface ReportResponse {
  type: ReportType
  from: string
  to: string
  rows: unknown[]
}

export async function GET(req: NextRequest) {
  return withErrorHandler(async (): Promise<ReturnType<typeof ok<ReportResponse>>> => {
    const tenantId = req.headers.get('x-tenant-id')!
    const userRole = req.headers.get('x-user-role')

    if (userRole !== 'GERENTE') {
      throw new ForbiddenError('Apenas gerentes podem acessar relatórios')
    }

    const { searchParams } = req.nextUrl
    const type = searchParams.get('type') as ReportType | null
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

    if (!type || !VALID_TYPES.includes(type)) {
      throw new UnprocessableError(
        `Tipo de relatório inválido. Use: ${VALID_TYPES.join(', ')}`
      )
    }

    const from = fromStr ? new Date(fromStr) : (() => {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      d.setHours(0, 0, 0, 0)
      return d
    })()

    const to = toStr ? new Date(toStr) : (() => {
      const d = new Date()
      d.setHours(23, 59, 59, 999)
      return d
    })()

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new UnprocessableError('Datas inválidas. Use formato ISO 8601 (YYYY-MM-DD)')
    }

    if (from > to) {
      throw new UnprocessableError('Data inicial deve ser anterior à data final')
    }

    const filter = { tenantId, from, to }
    const fromIso = from.toISOString()
    const toIso = to.toISOString()

    let rows: unknown[]
    switch (type) {
      case 'revenue':
        rows = await getRevenueReport(filter)
        break
      case 'services':
        rows = await getTopServices(filter)
        break
      case 'customers':
        rows = await getTopCustomers(filter)
        break
      case 'stock':
        rows = await getStockMovementsReport(filter)
        break
    }

    return ok({ type, from: fromIso, to: toIso, rows })
  })()
}
