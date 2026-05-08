'use client'

interface RBACGuardProps {
  requiredRole: 'GERENTE' | 'FUNCIONARIO'
  userRole: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Client-side component that renders children only when the user's role
 * matches the required role. GERENTE can access all routes; FUNCIONARIO
 * can only access FUNCIONARIO routes.
 */
export default function RBACGuard({ requiredRole, userRole, children, fallback = null }: RBACGuardProps) {
  if (requiredRole === 'GERENTE' && userRole !== 'GERENTE') {
    return <>{fallback}</>
  }

  return <>{children}</>
}
