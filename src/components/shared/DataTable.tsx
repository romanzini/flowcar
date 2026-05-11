'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  pageSize?: number
  emptyMessage?: string
  rowKey: (row: T) => string
}

type SortDir = 'asc' | 'desc' | null

function getValue<T>(row: T, key: keyof T | string): unknown {
  return (row as Record<string, unknown>)[key as string]
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 20,
  emptyMessage = 'Nenhum resultado encontrado.',
  rowKey,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [page, setPage] = useState(0)

  function handleSort(key: string) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortKey(null)
      setSortDir(null)
    }
    setPage(0)
  }

  const sorted = [...data].sort((a, b) => {
    if (!sortKey || !sortDir) return 0
    const av = getValue(a, sortKey)
    const bv = getValue(b, sortKey)
    const cmp =
      typeof av === 'string' && typeof bv === 'string'
        ? av.localeCompare(bv, 'pt-BR')
        : (av as number) < (bv as number)
          ? -1
          : (av as number) > (bv as number)
            ? 1
            : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  function SortIcon({ col }: { col: Column<T> }) {
    if (!col.sortable) return null
    const active = sortKey === col.key
    if (!active) return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-40" />
    if (sortDir === 'asc') return <ChevronUp className="ml-1 inline h-3 w-3" />
    return <ChevronDown className="ml-1 inline h-3 w-3" />
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300${col.sortable ? ' cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
                  onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                >
                  {col.header}
                  <SortIcon col={col} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {col.render
                        ? col.render(row)
                        : String(getValue(row, col.key) ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Página {page + 1} de {totalPages} — {data.length} registros
          </span>
          <div className="flex gap-2">
            <button
              className="rounded border px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              className="rounded border px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
