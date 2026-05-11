'use client'

interface LowStockBadgeProps {
  currentStock: number
  minimumStock: number
}

export default function LowStockBadge({ currentStock, minimumStock }: LowStockBadgeProps) {
  if (currentStock > minimumStock) return null

  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
      Estoque Crítico
    </span>
  )
}
