import { NextRequest, NextResponse } from 'next/server'
import { ForbiddenError, UnprocessableError } from '@/lib/api-error'
import {
  getRevenueReport,
  getTopServices,
  getTopCustomers,
  getStockMovementsReport,
} from '@/server/queries/reports'

const VALID_TYPES = ['revenue', 'services', 'customers', 'stock'] as const
type ReportType = (typeof VALID_TYPES)[number]

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0]!)
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))]
  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id')!
    const userRole = req.headers.get('x-user-role')

    if (userRole !== 'GERENTE') {
      throw new ForbiddenError('Apenas gerentes podem exportar relatórios')
    }

    const { searchParams } = req.nextUrl
    const type = searchParams.get('type') as ReportType | null
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

    if (!type || !VALID_TYPES.includes(type)) {
      throw new UnprocessableError(`Tipo inválido. Use: ${VALID_TYPES.join(', ')}`)
    }

    const from = fromStr
      ? new Date(fromStr)
      : (() => {
          const d = new Date()
          d.setDate(d.getDate() - 30)
          d.setHours(0, 0, 0, 0)
          return d
        })()

    const to = toStr
      ? new Date(toStr)
      : (() => {
          const d = new Date()
          d.setHours(23, 59, 59, 999)
          return d
        })()

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new UnprocessableError('Datas inválidas. Use formato ISO 8601 (YYYY-MM-DD)')
    }

    const filter = { tenantId, from, to }
    let rows: Record<string, unknown>[]

    switch (type) {
      case 'revenue':
        rows = (await getRevenueReport(filter)) as unknown as Record<string, unknown>[]
        break
      case 'services':
        rows = (await getTopServices(filter)) as unknown as Record<string, unknown>[]
        break
      case 'customers':
        rows = (await getTopCustomers(filter)) as unknown as Record<string, unknown>[]
        break
      case 'stock':
        rows = (await getStockMovementsReport(filter)) as unknown as Record<string, unknown>[]
        break
    }

    const csv = rowsToCsv(rows)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="relatorio.csv"',
      },
    })
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 })
    }
    if (err instanceof UnprocessableError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 422 })
    }
    console.error('[relatorios/export]', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
