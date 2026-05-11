'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from '@/components/shared/SessionProvider'
import ProductForm from '@/components/forms/ProductForm'
import StockMovementForm from '@/components/forms/StockMovementForm'
import LowStockBadge from '@/components/shared/LowStockBadge'

interface Product {
  id: string
  name: string
  unit: string
  currentStock: string | number
  minimumStock: string | number
  costPrice: string | number
  isActive: boolean
  isLowStock: boolean
}

interface StockMovement {
  id: string
  type: string
  quantity: string | number
  unitCost: string | number | null
  reason: string | null
  createdAt: string
  user: { name: string }
}

export default function InventarioPage() {
  const { authFetch } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Movement drawer state
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const [showMovementForm, setShowMovementForm] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = lowStockOnly ? '?lowStock=true' : ''
      const res = await authFetch(`/api/inventario${params}`)
      const json = await res.json()
      if (json.success) {
        setProducts(json.data)
      } else {
        setError(json.error ?? 'Erro ao carregar produtos')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [authFetch, lowStockOnly])

  useEffect(() => {
    void fetchProducts()
  }, [fetchProducts])

  const fetchMovements = useCallback(async (productId: string) => {
    setMovementsLoading(true)
    try {
      const res = await authFetch(`/api/inventario/${productId}/movimentacoes`)
      const json = await res.json()
      if (json.success) setMovements(json.data)
    } catch { /* ignore */ }
    finally { setMovementsLoading(false) }
  }, [authFetch])

  const openDrawer = (product: Product) => {
    setDrawerProduct(product)
    setShowMovementForm(false)
    void fetchMovements(product.id)
  }

  const closeDrawer = () => {
    setDrawerProduct(null)
    setMovements([])
    setShowMovementForm(false)
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Desativar este produto?')) return
    try {
      const res = await authFetch(`/api/inventario/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        void fetchProducts()
      } else {
        alert(json.error ?? 'Erro ao desativar produto')
      }
    } catch {
      alert('Erro de conexão')
    }
  }

  const typeLabel: Record<string, string> = {
    ENTRADA: 'Entrada',
    SAIDA: 'Saída',
    AJUSTE: 'Ajuste',
  }

  const typeColor: Record<string, string> = {
    ENTRADA: 'text-green-700 bg-green-50',
    SAIDA: 'text-red-700 bg-red-50',
    AJUSTE: 'text-yellow-700 bg-yellow-50',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventário</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie produtos e movimentações de estoque</p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setShowForm(true) }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo Produto
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Somente estoque crítico
        </label>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <ProductForm
              authFetch={authFetch}
              existing={editingProduct ?? undefined}
              onSuccess={() => {
                setShowForm(false)
                setEditingProduct(null)
                void fetchProducts()
              }}
              onCancel={() => { setShowForm(false); setEditingProduct(null) }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-500">Carregando…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum produto encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Produto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Unid.</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Estoque</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Mínimo</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Custo unit.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={p.isLowStock ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.unit}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {Number(p.currentStock).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {Number(p.minimumStock).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {Number(p.costPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3">
                    <LowStockBadge
                      currentStock={Number(p.currentStock)}
                      minimumStock={Number(p.minimumStock)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openDrawer(p)}
                        className="rounded px-2 py-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        Histórico
                      </button>
                      <button
                        onClick={() => { setEditingProduct(p); setShowForm(true) }}
                        className="rounded px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => void handleDeactivate(p.id)}
                        className="rounded px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Desativar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Movement History Drawer */}
      {drawerProduct && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="font-semibold text-gray-900">{drawerProduct.name}</h2>
                <p className="text-xs text-gray-500">Histórico de movimentações</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMovementForm(true)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  + Movimentação
                </button>
                <button onClick={closeDrawer} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {showMovementForm && (
                <div className="mb-4 rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <StockMovementForm
                    authFetch={authFetch}
                    productId={drawerProduct.id}
                    productName={drawerProduct.name}
                    onSuccess={() => {
                      setShowMovementForm(false)
                      void fetchMovements(drawerProduct.id)
                      void fetchProducts()
                    }}
                    onCancel={() => setShowMovementForm(false)}
                  />
                </div>
              )}

              {movementsLoading ? (
                <p className="text-sm text-gray-500">Carregando…</p>
              ) : movements.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="space-y-2">
                  {movements.map((m) => (
                    <div key={m.id} className="rounded-md border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[m.type] ?? ''}`}>
                          {typeLabel[m.type] ?? m.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(m.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">
                        Qtd: {Number(m.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                        {m.unitCost != null && (
                          <span className="text-gray-500 ml-2">
                            @ {Number(m.unitCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                      </p>
                      {m.reason && <p className="text-xs text-gray-500 mt-0.5">{m.reason}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">por {m.user.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
