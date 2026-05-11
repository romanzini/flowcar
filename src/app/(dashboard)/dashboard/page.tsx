'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from '@/components/shared/SessionProvider'
import KPICard from '@/components/dashboard/KPICard'
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist'

interface DashboardKPIs {
  dayRevenue: number
  openOrdersCount: number
  monthCompletedCount: number
  criticalStockCount: number
}

type OSStatus = 'AGUARDANDO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO'

interface RecentOrder {
  id: string
  number: string
  status: OSStatus
  totalAmount: string
  createdAt: string
  customer: { name: string }
  vehicle: { plate: string }
}

const STATUS_LABELS: Record<OSStatus, string> = {
  AGUARDANDO: 'Aguardando',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

const STATUS_COLORS: Record<OSStatus, string> = {
  AGUARDANDO: 'bg-yellow-100 text-yellow-800',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
  CONCLUIDO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function DashboardPage() {
  const { authFetch, user } = useSession()
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [kpisRes, ordersRes] = await Promise.all([
        authFetch('/api/dashboard/kpis'),
        authFetch('/api/ordens-servico'),
      ])
      const kpisJson = await kpisRes.json()
      const ordersJson = await ordersRes.json()

      if (kpisJson.success) setKpis(kpisJson.data as DashboardKPIs)
      if (ordersJson.success) {
        setRecentOrders((ordersJson.data as RecentOrder[]).slice(0, 10))
      }
    } catch {
      // silently fail — KPIs are non-critical
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bem-vindo de volta, {user?.name ?? 'usuário'}
        </p>
      </div>

      {/* Onboarding checklist — auto-hides when all 3 tasks complete */}
      {user?.role === 'GERENTE' && <OnboardingChecklist />}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="Receita do dia"
            value={formatCurrency(kpis.dayRevenue)}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KPICard
            label="OS abertas"
            value={kpis.openOrdersCount}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <KPICard
            label="OS concluídas no mês"
            value={kpis.monthCompletedCount}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KPICard
            label="Itens em estoque crítico"
            value={kpis.criticalStockCount}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            className={kpis.criticalStockCount > 0 ? 'border-l-4 border-red-500' : ''}
          />
        </div>
      ) : null}

      {/* Recent OS Summary */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Ordens de Serviço Recentes</h2>
        </div>
        {recentOrders.length === 0 && !loading ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">
            Nenhuma ordem de serviço encontrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Número', 'Cliente', 'Placa', 'Status', 'Valor', 'Data'].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {o.number}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {o.customer.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {o.vehicle.plate}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${STATUS_COLORS[o.status]}`}
                      >
                        {STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {formatCurrency(Number(o.totalAmount))}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
