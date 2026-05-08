# Ralph Progress Log

Feature: 001-plataforma-lava-jato
Started: 2026-05-08 16:18:14

## Codebase Patterns

- TypeScript 5 strict mode; path alias `@/*` → `./src/*`
- Tailwind CSS v4 with `@tailwindcss/postcss`; CSS uses `@import "tailwindcss"` + `@config`; tailwind.config.ts still needed for shadcn/ui theme tokens
- `darkMode` in tailwind.config.ts requires tuple `['class', 'selector']` (not just `['class']`) with Tailwind v4 types
- shadcn/ui components.json: style=new-york, rsc=true, cssVariables=true
- API envelope: `{ success: true, data: T }` or `{ success: false, error: string }` — from `@/types/api`
- Scripts: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run db:seed`
- Prisma 7.8.0 — `@prisma/streams-local` requires Node ≥ 22 (warn only on Node 20)

---
## Iteration 1 - 2026-05-08
**User Story**: Phase 1 — Setup (Infraestrutura Compartilhada)
**Tasks Completed**: 
- [x] T001: .env.example with all required env vars
- [x] T002: docker-compose.yml (PostgreSQL 17, Redis 7, MinIO, app with healthchecks)
- [x] T003: Dockerfile multi-stage production build (non-root user)
- [x] T004: package.json with all required dependencies (Next.js 15, React 19, Prisma 7, Zod 4, etc.)
- [x] T005: tailwind.config.ts + postcss.config.mjs + components.json (Tailwind v4 + shadcn/ui)
- [x] T006: eslint.config.mjs + tsconfig.json (TypeScript 5 strict)
- [x] T007: src/types/api.ts (ApiSuccess, ApiError, ApiResponse, PaginatedData)
**Tasks Remaining in Story**: None - story complete
**Commit**: 87a8baa
**Files Changed**: 
- .env.example
- .gitignore
- Dockerfile
- components.json
- docker-compose.yml
- eslint.config.mjs
- next.config.ts
- package.json
- package-lock.json
- postcss.config.mjs
- tailwind.config.ts
- tsconfig.json
- src/app/globals.css
- src/app/layout.tsx
- src/app/page.tsx
- src/types/api.ts
**Learnings**:
- create-next-app fails on non-empty directory; manual file creation is required for repos with pre-existing structure
- Tailwind v4 types require `darkMode: ['class', 'selector']` tuple; single-element `['class']` causes TS error
- `@tailwindcss/postcss` is the postcss plugin for Tailwind v4 (replaces `tailwindcss` + `autoprefixer`)
- CSS must use `@import "tailwindcss"; @config "../../tailwind.config.ts";` for v4 with config file
- `next lint` is deprecated in Next.js 15 (use eslint CLI) but still works
---


---
## Iteration 2 - 2026-05-08
**User Story**: Phase 2 — Foundational Infrastructure
**Tasks Completed**: 
- [x] T008: prisma/schema.prisma with all 17 entities, 9 enums, composite unique constraints
- [x] T009: Initial Prisma migration + Prisma client generated
- [x] T010: src/lib/prisma.ts — PrismaClient singleton with @prisma/adapter-pg
- [x] T011: src/lib/logging/logger.ts — pino structured logger + 6 SEC-010 typed helpers
- [x] T012: src/lib/utils.ts — generateSequentialNumber (atomic FOR UPDATE), generateUUID, maskPlate, slugify, ok()/fail()
- [x] T013: src/lib/validations/common.ts — slug, brazilianPhone, cpfCnpj, pagination, fileUpload Zod schemas
- [x] T014: src/lib/auth/jwt.ts — jose JWT sign/verify (15 min access token)
- [x] T015: src/lib/auth/redis.ts — refresh token CRUD, user revocation, sliding-window rate limiting
- [x] T016: src/lib/storage/s3.ts — S3Client for MinIO
- [x] T017: src/lib/storage/upload.ts — magic bytes validation (SEC-001), PutObject, pre-signed URL
- [x] T018: src/middleware.ts — JWT auth, tenant header forwarding, RBAC for FUNCIONARIO
- [x] T019: src/server/policies/rbac.ts — requireRole, assertTenantOwnership (404 not 403 per SEC-007)
- [x] T020: src/app/api/health/route.ts — /api/health checking PostgreSQL + MinIO
- [x] T020a: next.config.ts — HTTP security headers (SEC-003)
- [x] T021: src/app/error.tsx + src/lib/api-error.ts — error boundary + typed errors + withErrorHandler
**Tasks Remaining in Story**: None - story complete
**Commit**: f9fe93d
**Files Changed**: 
- prisma/schema.prisma
- prisma.config.ts
- prisma/migrations/20260508193202_init/migration.sql
- src/lib/prisma.ts
- src/lib/logging/logger.ts
- src/lib/utils.ts
- src/lib/validations/common.ts
- src/lib/auth/jwt.ts
- src/lib/auth/redis.ts
- src/lib/storage/s3.ts
- src/lib/storage/upload.ts
- src/middleware.ts
- src/server/policies/rbac.ts
- src/app/api/health/route.ts
- next.config.ts
- src/app/error.tsx
- src/lib/api-error.ts
**Learnings**:
- Prisma 7 breaking change: `url` in datasource block of schema.prisma is no longer supported; use `prisma.config.ts` with `defineConfig` for CLI; PrismaClient runtime requires `@prisma/adapter-pg` adapter
- Install `@prisma/adapter-pg` and `pg` and `@types/pg` for PostgreSQL driver adapter in Prisma 7
- NextRequest no longer has `.ip` property in Next.js 15; use `req.headers.get('x-forwarded-for')` instead
- `dotenv` is available as transitive dependency (via other packages) so `import 'dotenv/config'` works in prisma.config.ts
---

---
## Iteration 3 - 2026-05-08
**User Story**: Phase 3 — US-011 Cadastro e Onboarding de Novo Lava-Jato (P0)
**Tasks Completed**: 
- [x] T022: src/lib/validations/tenant.ts — Zod schema (businessName, slug, ownerName, email, password)
- [x] T023: src/server/services/tenant.service.ts — createTenant atomic transaction (Tenant + GERENTE User, bcrypt 12 rounds, SEC-010 logTenantCreated)
- [x] T024: src/app/api/tenants/route.ts — POST /api/tenants with rate limiting (10/IP/hour, SEC-004)
- [x] T025: src/app/(auth)/cadastro/page.tsx — SSR registration page with auth redirect
- [x] T026: src/components/forms/RegisterForm.tsx — React Hook Form + Zod with slug preview feedback
- [x] T027: src/lib/validations/user.ts — employee create/update Zod schemas
- [x] T028: src/server/services/user.service.ts — employee CRUD with bcrypt + Redis token revocation on deactivate
- [x] T029: src/app/api/funcionarios/route.ts — GET + POST (GERENTE only via middleware)
- [x] T030: src/app/api/funcionarios/[id]/route.ts — GET + PATCH + DELETE with tenantId ownership assertion
- [x] T031: src/server/queries/onboarding.ts — getOnboardingState(tenantId) derived from DB facts
**Tasks Remaining in Story**: None - story complete
**Commit**: 6a18c6b
**Files Changed**: 
- src/lib/validations/tenant.ts
- src/lib/validations/user.ts
- src/server/services/tenant.service.ts
- src/server/services/user.service.ts
- src/server/queries/onboarding.ts
- src/app/api/tenants/route.ts
- src/app/api/funcionarios/route.ts
- src/app/api/funcionarios/[id]/route.ts
- src/app/(auth)/cadastro/page.tsx
- src/components/forms/RegisterForm.tsx
- specs/001-plataforma-lava-jato/tasks.md
**Learnings**:
- `ok()` helper in utils.ts already returns NextResponse; don't double-wrap with NextResponse.json(ok(...)) — just return ok(data) directly
- Zod v4 uses `error.issues` (not `error.errors`) for accessing validation error details
- withErrorHandler expects a thunk `() => Promise<...>`; route handlers must call `withErrorHandler(async () => { ... })()`
- Prisma unique constraint violation code is 'P2002'; meta.target array contains the conflicting field names
---

---
## Iteration 4 - 2026-05-08
**User Story**: Phase 4 — US-001 Autenticação e Controle de Acesso por Papel (P1)
**Tasks Completed**: 
- [x] T032: src/lib/validations/auth.ts — loginRequest, refreshRequest, tokenResponse Zod schemas
- [x] T033: src/server/services/auth.service.ts — login (constant-time bcrypt, rate limit, logLoginSuccess/Failure), logout, refreshToken (rotate)
- [x] T034: src/app/api/auth/login/route.ts — POST with SEC-005 HttpOnly cookie
- [x] T035: src/app/api/auth/logout/route.ts — POST revokes refresh token, clears cookie
- [x] T036: src/app/api/auth/refresh/route.ts — POST rotates refresh token, returns new access token
- [x] T037: src/app/(auth)/login/page.tsx — SSR login page with refresh_token cookie check
- [x] T038: src/components/forms/LoginForm.tsx — RHF+Zod login form, no field-specific error leakage
- [x] T039: src/components/shared/Sidebar.tsx — role-filtered nav (FUNCIONARIO excludes Funcionários, Contratos, Relatórios, Configurações)
- [x] T040: src/app/(dashboard)/layout.tsx — server-side cookie check + SessionProvider + DashboardAuthGuard
- [x] T041: src/app/(dashboard)/funcionarios/page.tsx — GERENTE-only employee list with create/edit/deactivate
- [x] T042: src/components/shared/RBACGuard.tsx — client-side role guard component
- [x] T043: src/components/forms/EmployeeForm.tsx — employee create/edit form (name, email, password, role, phone)
**Tasks Remaining in Story**: None - story complete
**Commit**: 688fb10
**Files Changed**: 
- src/lib/validations/auth.ts
- src/server/services/auth.service.ts
- src/app/api/auth/login/route.ts
- src/app/api/auth/logout/route.ts
- src/app/api/auth/refresh/route.ts
- src/app/(auth)/login/page.tsx
- src/components/forms/LoginForm.tsx
- src/components/shared/Sidebar.tsx
- src/components/shared/SessionProvider.tsx
- src/components/shared/DashboardAuthGuard.tsx
- src/components/shared/RBACGuard.tsx
- src/app/(dashboard)/layout.tsx
- src/app/(dashboard)/dashboard/page.tsx
- src/app/(dashboard)/funcionarios/page.tsx
- src/components/forms/EmployeeForm.tsx
**Learnings**:
- Zod v4 schema types for `zodResolver` require `as any` cast when switching between create (required) and update (optional) schemas in a shared form component
- Access token stored in sessionStorage (client-side only); SSR dashboard layout checks refresh_token HttpOnly cookie for the initial redirect guard
- DashboardAuthGuard client component handles the actual token presence check and redirects to /login if no access token in sessionStorage
- constant-time bcrypt comparison: always run `bcrypt.compare` even when user not found (use dummy hash) to prevent timing attacks that reveal email existence
---
