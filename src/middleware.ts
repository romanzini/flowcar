import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { logAccessDenied } from '@/lib/logging/logger'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/tenants',
  '/fila/',
  '/contratos/assinar/',
  '/api/fila-publica/',
  '/api/contratos/publico/',
  '/login',
  '/cadastro',
]

// Routes blocked for FUNCIONARIO role
const GERENTE_ONLY_ROUTES = [
  '/funcionarios',
  '/contratos',
  '/relatorios',
  '/configuracoes',
  '/api/funcionarios',
  '/api/contratos',
  '/api/relatorios',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // Extract access token from Authorization header
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    logAccessDenied(pathname, undefined, ip)
    return NextResponse.json(
      { success: false, error: 'Não autenticado' },
      { status: 401 }
    )
  }

  try {
    const payload = await verifyAccessToken(token)
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

    // RBAC: block FUNCIONARIO from restricted routes
    if (
      payload.role === 'FUNCIONARIO' &&
      GERENTE_ONLY_ROUTES.some((route) => pathname.includes(route))
    ) {
      logAccessDenied(pathname, payload.userId, ip)
      return NextResponse.json(
        { success: false, error: 'Permissão insuficiente para esta operação' },
        { status: 403 }
      )
    }

    // Forward identity headers to Route Handlers
    const headers = new Headers(req.headers)
    headers.set('x-user-id', payload.userId)
    headers.set('x-tenant-id', payload.tenantId)
    headers.set('x-user-role', payload.role)

    return NextResponse.next({ request: { headers } })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Token inválido ou expirado' },
      { status: 401 }
    )
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
