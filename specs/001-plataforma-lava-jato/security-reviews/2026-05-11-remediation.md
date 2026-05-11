---
document_type: security-review
review_type: branch
assessment_date: 2026-05-11
codebase_analyzed: flowcar / 001-plataforma-lava-jato (Phase 15 remediation)
total_files_analyzed: 9
total_findings: 3
overall_risk: LOW
critical_count: 0
high_count: 0
medium_count: 0
low_count: 2
informational_count: 1
owasp_categories: [A05]
cwe_ids: [CWE-20, CWE-436, CWE-693]
field_summaries:
  document_type: "Always 'security-review'. Allows indexers to skip non-review documents."
  review_type: "Which command generated this document: audit, branch, staged, plan, tasks, or followup."
  assessment_date: "ISO 8601 date the review was performed (YYYY-MM-DD)."
  overall_risk: "Highest severity tier with active findings (CRITICAL, HIGH, MODERATE, LOW, INFORMATIONAL)."
  critical_count: "Number of Critical findings (CVSS 9.0-10.0)."
  high_count: "Number of High findings (CVSS 7.0-8.9)."
  medium_count: "Number of Medium findings (CVSS 4.0-6.9)."
  low_count: "Number of Low findings (CVSS 0.1-3.9)."
  informational_count: "Number of Informational findings."
  owasp_categories: "OWASP Top 10 2025 categories (A01-A10) that have at least one finding."
  cwe_ids: "CWE identifiers referenced in this document."
  finding_id: "Unique finding identifier (SEC-NNN) for cross-referencing and task linkage."
  location: "File path and line number of the vulnerable code (path/to/file.ext:line)."
  owasp_category: "OWASP Top 10 2025 category for this finding (AXX:2025-Name)."
  cwe: "Common Weakness Enumeration identifier with short name (CWE-NNN: Name)."
  cvss_score: "CVSS v3.1 base score (0.0-10.0). 9.0+=Critical, 7.0-8.9=High, 4.0-6.9=Medium, 0.1-3.9=Low."
  spec_kit_task: "Spec-Kit task ID for backlog tracking and remediation follow-up (TASK-SEC-NNN)."
---

# SECURITY REVIEW REPORT — REMEDIATION VALIDATION

**Scope:** Commits `f5861df` and `8cb7417` (Phase 15 — Security Remediation, TASK-SEC-001 → TASK-SEC-007)  
**Prior review:** `specs/001-plataforma-lava-jato/security-reviews/2026-05-11-branch.md`  
**Target branch:** `001-plataforma-lava-jato` (HEAD `8cb7417`)

## Executive Summary

All 7 findings from the prior review were addressed. **6 are fully resolved.** The
CSP nonce migration (SEC-003 / TASK-SEC-003) is partially resolved: `unsafe-inline`
is correctly removed and nonce-based enforcement works for all authenticated routes,
but the nonce is not forwarded to Server Components for public routes, leaving a
functional gap that could cause style failures on login, cadastro, and contract
signing pages. Two additional low-severity implementation gaps and one informational
finding were identified in the remediation code itself.

**Overall risk drops from MODERATE → LOW.**

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 2 |
| Informational | 1 |

---

## Files Reviewed

| File | Change type |
|------|-------------|
| `src/middleware.ts` | Modified — nonce generation + CSP injection |
| `src/app/layout.tsx` | Modified — async layout, nonce style element |
| `src/app/api/contratos/publico/[token]/route.ts` | Modified — startup assertion + token rate limit |
| `src/app/api/relatorios/export/route.ts` | Modified — from≤to guard + 366-day cap |
| `src/app/api/relatorios/route.ts` | Modified — 366-day cap |
| `src/lib/validations/batch.ts` | Modified — `.max(200)` |
| `src/server/services/contract.service.ts` | Modified — PII stripped from publicContractSelect |
| `next.config.ts` | Modified — static CSP removed |
| `prisma/seed.ts` | Modified — NODE_ENV guard |

---

## Prior Finding Verification

| Finding | Severity | Status | Notes |
|---------|----------|--------|-------|
| SEC-001 — IP rate-limit spoofing | MEDIUM | ✅ RESOLVED | Token-keyed rate limit added in parallel with IP key; production assertion added |
| SEC-002 — PII in public contract response | MEDIUM | ✅ RESOLVED | `email`, `phone`, `address` removed from `publicContractSelect` |
| SEC-003 — `style-src 'unsafe-inline'` | LOW | ⚠️ PARTIAL | `unsafe-inline` removed ✅; nonce enforced for auth routes ✅; nonce missing from public route request headers (see REM-001) |
| SEC-004 — Missing date order in export | LOW | ✅ RESOLVED | `from > to` guard added |
| SEC-005 — No date range cap | LOW | ✅ RESOLVED | 366-day cap added to both routes |
| SEC-006 — Unbounded batch IDs | LOW | ✅ RESOLVED | `.min(1).max(200)` applied |
| SEC-007 — Hardcoded seed credentials | INFO | ✅ RESOLVED | `NODE_ENV === 'production'` early-exit guard added |

---

## New Findings in Remediation Code

### [LOW] REM-001 — CSP Nonce Not Forwarded to Server Components on Public Routes

**Location:** `src/middleware.ts:52–58`  
**CVSS Score:** 3.1 (AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:L/A:N)  
**OWASP Category:** A05:2021 — Security Misconfiguration  
**CWE:** CWE-693: Protection Mechanism Failure  
**Spec-Kit Task:** TASK-SEC-008

**Description:**  
For authenticated routes the nonce is correctly set on both request headers
(`headers.set('x-nonce', nonce)` inside `NextResponse.next({ request: { headers } })`)
and response headers, allowing `layout.tsx` to read it via `headers().get('x-nonce')`.
For **public routes** the nonce is only set on the response:

```typescript
// Public route handler (line 52-58):
if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
  const res = NextResponse.next()         // ← no request headers modified
  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('x-nonce', nonce)       // ← response header only
  return res
}
```

`next/headers`'s `headers()` function reads **request** headers. Because the nonce
is not forwarded in request headers, `layout.tsx` receives `nonce = ''` for all
public pages (`/login`, `/cadastro`, `/contratos/assinar/[token]`). Consequently:

1. The `{nonce && <style nonce={nonce} />}` guard renders nothing — React cannot
   associate the nonce with its own injected styles.
2. Any inline `<style>` element generated by the Next.js runtime for those pages
   (e.g., React 18 streaming CSS) will lack the nonce and be blocked by the CSP.
3. The gap creates inconsistent enforcement: authenticated pages honour the nonce
   contract end-to-end; unauthenticated pages do not.

In practice, the app uses Tailwind CSS (class-based, loaded via `globals.css`) so
visible breakage may not be immediate, but the control is not functioning as
designed on public routes.

**Remediation:**  
Forward the nonce in request headers for public routes, mirroring the authenticated
path:

```typescript
if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
  const reqHeaders = new Headers(req.headers)
  reqHeaders.set('x-nonce', nonce)
  const res = NextResponse.next({ request: { headers: reqHeaders } })
  res.headers.set('Content-Security-Policy', csp)
  return res
}
```

---

### [LOW] REM-002 — `TRUSTED_PROXY_IPS` Assertion Fires at First Request, Not Server Startup

**Location:** `src/app/api/contratos/publico/[token]/route.ts:17–19`  
**CVSS Score:** 2.7 (AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N)  
**OWASP Category:** A05:2021 — Security Misconfiguration  
**CWE:** CWE-436: Interpretation Conflict  
**Spec-Kit Task:** TASK-SEC-009

**Description:**  
The production assertion is implemented as top-level module code:

```typescript
if (process.env.NODE_ENV === 'production' && !process.env.TRUSTED_PROXY_IPS) {
  throw new Error('TRUSTED_PROXY_IPS must be set in production')
}
```

In Next.js, route modules are loaded **lazily** — the module is imported (and this
code executes) only when the first HTTP request reaches that route. On a freshly
deployed production server without `TRUSTED_PROXY_IPS`, the server starts normally,
reports as healthy, accepts traffic on all other routes, and only crashes when
a request hits `/api/contratos/publico/[token]`. Until that moment the rate-limit
bypass vulnerability (SEC-001) is silently active.

**Remediation:**  
Move the assertion to the application startup path — the `initWorkers()` call in
`src/app/layout.tsx` or a dedicated `src/lib/startup.ts` imported by `layout.tsx`:

```typescript
// src/lib/startup.ts
export function assertProductionConfig() {
  if (process.env.NODE_ENV === 'production' && !process.env.TRUSTED_PROXY_IPS) {
    throw new Error('TRUSTED_PROXY_IPS must be set in production')
  }
}
```

```typescript
// src/app/layout.tsx (server component — runs on first render)
import { assertProductionConfig } from '@/lib/startup'
assertProductionConfig()
```

This runs at first render (not module import time) but is still far earlier and
more visible than a route-specific module load.

---

### [INFORMATIONAL] REM-003 — Raw URL Parameter Used as Redis Key Suffix Without Length Bound

**Location:** `src/app/api/contratos/publico/[token]/route.ts:114`  
**CVSS Score:** 0.0 (bounded by HTTP stack limits)  
**OWASP Category:** A05:2021 — Security Misconfiguration  
**CWE:** CWE-20: Improper Input Validation  
**Spec-Kit Task:** TASK-SEC-010

**Description:**  
The token from the URL path parameter is used directly as a Redis key suffix:

```typescript
const [ipRateLimit, tokenRateLimit] = await Promise.all([
  checkSigningRateLimit(ip),
  checkSigningRateLimit(token),   // ← raw URL param, no length check
])
```

`key = csrf:sign:attempts:${token}` — if an attacker sends a path parameter of
several thousand characters, the resulting Redis key would be abnormally large.
Redis supports keys up to 512 MB, so there is no hard failure, but unnecessarily
large keys waste memory and sorted-set storage.

In practice, Node.js / Next.js route handlers impose a URL length limit (~8,192
bytes by default) and the token comes from `params` which Next.js parses from the
URL path segment. Exploitation would require bypassing that limit or is bounded
within it. Risk is informational.

**Remediation:**  
Add a token length guard before the rate-limit calls:

```typescript
const { token } = await params
if (token.length > 128) {
  throw new NotFoundError('Contrato não encontrado ou link expirado')
}
```

---

## Confirmed Secure Patterns (Remediation)

| Pattern | Location | Notes |
|---------|----------|-------|
| Token-keyed rate limit | `publico/[token]/route.ts:114` | IP and token checked in parallel; `Promise.all` prevents timing differential |
| Dual-key rate limit parity | `checkSigningRateLimit(rateLimitKey)` | Shared implementation — identical window/limit for both keys |
| PII stripped from public response | `contract.service.ts:publicContractSelect` | Only `id` and `name` returned; typecheck confirms no consumers use removed fields |
| `from > to` + 366-day cap | `relatorios/route.ts` and `export/route.ts` | Both routes now consistently validate date range |
| `.min(1).max(200)` batch schema | `validations/batch.ts` | Clean rewrite; removes the `.refine()` anti-pattern |
| `NODE_ENV` seed guard | `prisma/seed.ts` | Exits early with clear message before any DB operations |
| CSP nonce for authenticated routes | `middleware.ts` + `layout.tsx` | Full chain: generate → request header → Server Component → `<style nonce>` |
| Static headers preserved | `next.config.ts` | X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy unchanged |

---

## Prioritized Action Plan

| Priority | ID | Action | Effort |
|----------|----|--------|--------|
| 1 | REM-001 | Forward nonce in request headers for public routes | ~10 min |
| 2 | REM-002 | Move `TRUSTED_PROXY_IPS` assertion to startup path | ~15 min |
| 3 | REM-003 | Add 128-char token length guard before rate-limit calls | ~5 min |

---

## Memory Hub INDEX.md Row

```text
| specs/001-plataforma-lava-jato/security-reviews/2026-05-11-remediation.md | branch | 2026-05-11 | LOW | C:0 H:0 M:0 L:2 | A05 |
```
