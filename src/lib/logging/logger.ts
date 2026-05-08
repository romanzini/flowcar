import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: undefined,
})

// ─── Typed log helpers for security events (SEC-010) ──────────────────────────

export function logLoginSuccess(userId: string, tenantId: string) {
  logger.info({ module: 'auth', userId, tenantId }, 'Login successful')
}

export function logLoginFailure(email: string, ip: string) {
  // Never log the password — only email (for triage) and source IP
  logger.warn({ module: 'auth', email, ip }, 'Login failed')
}

export function logAccessDenied(route: string, userId: string | undefined, ip: string) {
  logger.warn({ module: 'rbac', route, userId, ip }, 'Access denied')
}

export function logFileUpload(tenantId: string, type: string, size: number) {
  logger.info({ module: 'storage', tenantId, type, size }, 'File uploaded')
}

export function logContractSigned(contractId: string, tenantId: string, ip: string) {
  logger.info({ module: 'contracts', contractId, tenantId, ip }, 'Contract signed')
}

export function logTenantCreated(tenantId: string, slug: string) {
  logger.info({ module: 'tenants', tenantId, slug }, 'Tenant created')
}

export default logger
