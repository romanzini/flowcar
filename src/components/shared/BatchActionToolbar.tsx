'use client'

import { useState } from 'react'

export interface BatchAction {
  label: string
  value: string
}

interface BatchActionToolbarProps {
  selectedCount: number
  actions: BatchAction[]
  onAction: (action: string) => void | Promise<void>
  loading?: boolean
}

export function BatchActionToolbar({
  selectedCount,
  actions,
  onAction,
  loading = false,
}: BatchActionToolbarProps) {
  const [selectedAction, setSelectedAction] = useState('')

  if (selectedCount === 0) return null

  const handleConfirm = async () => {
    if (!selectedAction) return
    await onAction(selectedAction)
    setSelectedAction('')
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm">
      <span className="font-medium text-blue-800">
        {selectedCount} {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}
      </span>
      <select
        value={selectedAction}
        onChange={(e) => setSelectedAction(e.target.value)}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700"
        disabled={loading}
      >
        <option value="">Escolha uma ação…</option>
        {actions.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleConfirm}
        disabled={!selectedAction || loading}
        className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {loading ? 'Aplicando…' : 'Aplicar'}
      </button>
    </div>
  )
}
