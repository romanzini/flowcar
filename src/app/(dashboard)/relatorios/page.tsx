'use client'

import { useState, useCallback } from 'react'
import { useSession } from '@/components/shared/SessionProvider'

type ReportType = 'revenue' | 'services' | 'customers' | 'stock'

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'revenue', label: 'Receita por dia' },
  { value: 'services', label: 'Top serviços' },
  { value: 'customers', label: 'Top clientes' },
  { value: 'stock', label: 'Movimentações de estoque' },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function getDefaultDates() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

interface RevenueRow { date: string; revenue: number; ordersCount: number }
interface ServicesRow { serviceTypeName: string; count: number; revenue: number }
interface CustomersRow { customerId: string; customerName: string; ordersCount: number; totalSpent: number }
interface StockRow { date: string; productName: string; type: string; quantity: number; unitCost: number }

type ReportRow = RevenueRow | ServicesRow | CustomersRow | StockRow

interface ReportResult {
  type: ReportType
  rows: ReportRow[]
}

function RevenueTable({ rows }: { rows: RevenueRow[] }) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {['Data', 'Receita', 'OS concluídas'].map((h) => (
            <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {rows.map((r) => (
          <tr key={r.date} className="hover:bg-gray-50">
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">{r.date}</td>
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">{formatCurrency(r.revenue)}</td>
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700">{r.ordersCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ServicesTable({ rows }: { rows: ServicesRow[] }) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {['Serviço', 'Quantidade', 'Receita total'].map((h) => (
            <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">{r.serviceTypeName}</td>
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700">{r.count}</td>
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">{formatCurrency(r.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CustomersTable({ rows }: { rows: CustomersRow[] }) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {['Cliente', 'OS realizadas', 'Total gasto'].map((h) => (
            <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {rows.map((r) => (
          <tr key={r.customerId} className="hover:bg-gray-50">
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">{r.customerName}</td>
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700">{r.ordersCount}</td>
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">{formatCurrency(r.totalSpent)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function StockTable({ rows }: { rows: StockRow[] }) {
  const typeLabels: Record<string, string> = { ENTRADA: 'Entrada', SAIDA: 'Saída', AJUSTE: 'Ajuste' }
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {['Data', 'Produto', 'Tipo', 'Quantidade', 'Custo unitário'].map((h) => (
            <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">{r.date}</td>
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">{r.productName}</td>
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700">{typeLabels[r.type] ?? r.type}</td>
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700">{r.quantity}</td>
            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700">{formatCurrency(r.unitCost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function RelatoriosPage() {
  const { authFetch } = useSession()
  const defaults = getDefaultDates()
  const [reportType, setReportType] = useState<ReportType>('revenue')
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [loading, setLoading] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReportResult | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ type: reportType, from, to })
      const res = await authFetch(`/api/relatorios?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setResult({ type: reportType, rows: json.data.rows as ReportRow[] })
      } else {
        setError(json.error ?? 'Erro ao carregar relatório')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [authFetch, reportType, from, to])

  const exportCsv = useCallback(async () => {
    setCsvLoading(true)
    try {
      const params = new URLSearchParams({ type: reportType, from, to })
      const res = await authFetch(`/api/relatorios/export?${params.toString()}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError((json as { error?: string }).error ?? 'Erro ao exportar CSV')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'relatorio.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Erro de conexão ao exportar')
    } finally {
      setCsvLoading(false)
    }
  }, [authFetch, reportType, from, to])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>

      {/* Filters */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de relatório</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">De</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Até</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => void fetchReport()}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Carregando...' : 'Gerar relatório'}
          </button>
          <button
            onClick={() => void exportCsv()}
            disabled={csvLoading}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {csvLoading ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              {REPORT_TYPES.find((t) => t.value === result.type)?.label}
            </h2>
            {result.rows.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">Nenhum resultado para o período selecionado.</p>
            )}
          </div>
          {result.rows.length > 0 && (
            <div className="overflow-x-auto">
              {result.type === 'revenue' && <RevenueTable rows={result.rows as RevenueRow[]} />}
              {result.type === 'services' && <ServicesTable rows={result.rows as ServicesRow[]} />}
              {result.type === 'customers' && <CustomersTable rows={result.rows as CustomersRow[]} />}
              {result.type === 'stock' && <StockTable rows={result.rows as StockRow[]} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
