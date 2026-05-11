import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { logAccessDenied } from '@/lib/logging/logger'

const minioEndpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000'

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: ${minioEndpoint}`,
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

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
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)
  const nonce = btoa(Array.from(nonceBytes, (b) => String.fromCharCode(b)).join(''))
  const csp = buildCsp(nonce)

  // Allow public routes — forward nonce in request headers so Server Components
  // can read it via next/headers, mirroring the authenticated-route path below.
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const reqHeaders = new Headers(req.headers)
    reqHeaders.set('x-nonce', nonce)
    const res = NextResponse.next({ request: { headers: reqHeaders } })
    res.headers.set('Content-Security-Policy', csp)
    return res
  }

  // Allow Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // Only enforce JWT Bearer auth on API routes.
  // Page routes handle their own auth via DashboardLayout (refresh_token cookie).
  if (!pathname.startsWith('/api/')) {
    const reqHeaders = new Headers(req.headers)
    reqHeaders.set('x-nonce', nonce)
    const res = NextResponse.next({ request: { headers: reqHeaders } })
    res.headers.set('Content-Security-Policy', csp)
    return res
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

    // Forward identity headers and nonce to Route Handlers / Server Components
    const headers = new Headers(req.headers)
    headers.set('x-user-id', payload.userId)
    headers.set('x-tenant-id', payload.tenantId)
    headers.set('x-user-role', payload.role)
    headers.set('x-nonce', nonce)

    const res = NextResponse.next({ request: { headers } })
    res.headers.set('Content-Security-Policy', csp)
    res.headers.set('x-nonce', nonce)
    return res
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
