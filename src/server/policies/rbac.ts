import type { JwtPayload } from '@/lib/auth/jwt'
import { ForbiddenError, NotFoundError } from '@/lib/api-error'
import { logAccessDenied } from '@/lib/logging/logger'

// ─── RBAC role guard ──────────────────────────────────────────────────────────

export function requireRole(
  session: JwtPayload,
  requiredRole: string,
  ip = 'unknown'
): void {
  if (session.role !== requiredRole) {
    logAccessDenied('unknown', session.userId, ip)
    throw new ForbiddenError('Permissão insuficiente para esta operação')
  }
}

// ─── Tenant ownership assertion ───────────────────────────────────────────────
// SEC-007: Returns 404 (not 403) to prevent cross-tenant resource enumeration

export function assertTenantOwnership(
  resourceTenantId: string,
  session: JwtPayload,
  ip = 'unknown'
): void {
  if (resourceTenantId !== session.tenantId) {
    logAccessDenied('resource', session.userId, ip)
    // Use 404 intentionally — do not reveal that resource exists under a different tenant
    throw new NotFoundError()
  }
}
