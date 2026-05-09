interface KPICardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
  className?: string
}

export default function KPICard({ label, value, icon, trend, className = '' }: KPICardProps) {
  return (
    <div className={`rounded-lg bg-white p-6 shadow ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
          {trend && (
            <p
              className={`mt-1 text-sm ${
                trend.positive !== false ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className="ml-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  )
}
