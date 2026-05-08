'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Início', roles: ['GERENTE', 'FUNCIONARIO'] },
  { href: '/dashboard/ordens-servico', label: 'Ordens de Serviço', roles: ['GERENTE', 'FUNCIONARIO'] },
  { href: '/dashboard/clientes', label: 'Clientes', roles: ['GERENTE', 'FUNCIONARIO'] },
  { href: '/dashboard/inventario', label: 'Estoque', roles: ['GERENTE', 'FUNCIONARIO'] },
  { href: '/dashboard/orcamentos', label: 'Orçamentos', roles: ['GERENTE', 'FUNCIONARIO'] },
  { href: '/dashboard/funcionarios', label: 'Funcionários', roles: ['GERENTE'] },
  { href: '/dashboard/contratos', label: 'Contratos', roles: ['GERENTE'] },
  { href: '/dashboard/relatorios', label: 'Relatórios', roles: ['GERENTE'] },
  { href: '/dashboard/configuracoes', label: 'Configurações', roles: ['GERENTE'] },
]

interface SidebarProps {
  userRole: string
  userName: string
}

export default function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('user')
    window.location.href = '/login'
  }

  return (
    <aside className="flex h-full w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center px-6 border-b border-gray-700">
        <span className="text-xl font-bold">FlowCar</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-700 p-4">
        <p className="text-xs text-gray-400 truncate mb-2">{userName}</p>
        <button
          onClick={handleLogout}
          className="w-full rounded-md bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
