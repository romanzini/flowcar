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
## Iteration 5 - 2026-05-08
**User Story**: Phase 5 — US-002 Gestão de Clientes e Veículos (P2)
**Tasks Completed**: 
- [x] T044: src/lib/validations/customer.ts — customerCreateSchema / customerUpdateSchema (Zod)
- [x] T045: src/lib/validations/vehicle.ts — vehicleCreateSchema / vehicleUpdateSchema with plate uppercase transform + regex
- [x] T046: src/server/services/customer.service.ts — list (masked cpfCnpj), getById (unmasked), create, update, deactivate (blocked if active OS or AGUARDANDO_ASSINATURA contracts)
- [x] T047: src/server/services/vehicle.service.ts — listByCustomer, getById, create (plate uniqueness per tenant), update, deactivate (blocked if active OS)
- [x] T048: src/app/api/clientes/route.ts — GET (list + ?search) + POST
- [x] T049: src/app/api/clientes/[id]/route.ts — GET + PATCH + DELETE
- [x] T050: src/app/api/veiculos/route.ts — GET (list by ?customerId) + POST
- [x] T051: src/app/api/veiculos/[id]/route.ts — GET + PATCH + DELETE
- [x] T052: src/app/(dashboard)/clientes/page.tsx — debounced search, create button, list table
- [x] T053: src/app/(dashboard)/clientes/[id]/page.tsx — customer detail + vehicles list with add/edit/deactivate
- [x] T054: src/components/forms/CustomerForm.tsx — RHF + Zod, all optional fields
- [x] T055: src/components/forms/VehicleForm.tsx — plate auto-uppercase, RHF + Zod
**Tasks Remaining in Story**: None - story complete
**Commit**: f0edcee
**Files Changed**: 
- src/lib/validations/customer.ts
- src/lib/validations/vehicle.ts
- src/server/services/customer.service.ts
- src/server/services/vehicle.service.ts
- src/app/api/clientes/route.ts
- src/app/api/clientes/[id]/route.ts
- src/app/api/veiculos/route.ts
- src/app/api/veiculos/[id]/route.ts
- src/app/(dashboard)/clientes/page.tsx
- src/app/(dashboard)/clientes/[id]/page.tsx
- src/components/forms/CustomerForm.tsx
- src/components/forms/VehicleForm.tsx
- specs/001-plataforma-lava-jato/tasks.md
**Learnings**:
- CPF masking: `***.{d3-5}.{d6-8}-**`; CNPJ masking: `**.{d2-4}.{d5-7}/{d8-11}-**` (from raw digit string)
- Zod `.transform().pipe()` is required for plate normalization (toUpperCase + strip non-alphanumeric) before regex validation
- `useCallback` with `authFetch` dependency is needed for debounced search to avoid stale closure issues in Next.js App Router client components

---
## Iteration 6 - 2026-05-08
**User Story**: Phase 6 — US-003 Ordens de Serviço e Fila Interna (P3)
**Tasks Completed**: 
- [x] T056: src/lib/validations/service-order.ts — OS create/update/status/item Zod schemas
- [x] T057: src/server/services/queue.service.ts — insertQueueEntry, promoteToInProgress, removeFromQueue, resequencePositions
- [x] T058: src/server/services/service-order.service.ts — createOS, transitionStatus, addItem, removeItem, getById, list, updateOS
- [x] T059: src/app/api/ordens-servico/route.ts — GET (filters) + POST
- [x] T060: src/app/api/ordens-servico/[id]/route.ts — GET + PATCH
- [x] T061: src/app/api/ordens-servico/[id]/status/route.ts — PATCH status transition
- [x] T062: src/app/api/ordens-servico/[id]/items/route.ts — POST (add) + DELETE (remove by itemId query param)
- [x] T063: src/app/api/uploads/route.ts — multipart upload with magic bytes validation (SEC-001) + logFileUpload (SEC-010); also src/app/api/uploads/[id]/url/route.ts for pre-signed URL
- [x] T064: src/app/(dashboard)/ordens-servico/page.tsx — status filter tabs, list table
- [x] T065: src/app/(dashboard)/ordens-servico/nova/page.tsx — new OS form page
- [x] T066: src/app/(dashboard)/ordens-servico/[id]/page.tsx — detail with status actions, items table, photo gallery
- [x] T067: src/components/forms/ServiceOrderForm.tsx — client/vehicle async search, multi-item rows, total calc
- [x] T068: src/components/shared/FileUpload.tsx — type/size frontend validation, progress indicator
- [x] T069: src/components/shared/PhotoGallery.tsx — pre-signed URL fetch on demand, lightbox
- [x] T070: src/server/queries/queue-internal.ts — getInternalQueue(tenantId)
**Tasks Remaining in Story**: None - story complete
**Commit**: 6048615
**Files Changed**: 
- src/lib/validations/service-order.ts
- src/server/services/queue.service.ts
- src/server/services/service-order.service.ts
- src/server/queries/queue-internal.ts
- src/app/api/ordens-servico/route.ts
- src/app/api/ordens-servico/[id]/route.ts
- src/app/api/ordens-servico/[id]/status/route.ts
- src/app/api/ordens-servico/[id]/items/route.ts
- src/app/api/uploads/route.ts
- src/app/api/uploads/[id]/url/route.ts
- src/app/api/tipos-servico/route.ts
- src/app/(dashboard)/ordens-servico/page.tsx
- src/app/(dashboard)/ordens-servico/nova/page.tsx
- src/app/(dashboard)/ordens-servico/[id]/page.tsx
- src/components/forms/ServiceOrderForm.tsx
- src/components/shared/FileUpload.tsx
- src/components/shared/PhotoGallery.tsx
- specs/001-plataforma-lava-jato/tasks.md
**Learnings**:
- Zod v4 uses `error:` (not `errorMap:`) for custom enum error messages
- FileUpload → ServiceOrder is many-to-many via `@relation("ServiceOrderFiles")`; connecting via `serviceOrderFiles: { connect: { id: serviceOrderId } }` in prisma.create
- PhotoGallery uses `<img>` (not `next/image`) due to dynamic MinIO pre-signed URLs — only triggers a warning, not an error
- Bonus: created `/api/tipos-servico` (GET active service types) and `/api/uploads/[id]/url` (pre-signed URL) as supporting endpoints required by ServiceOrderForm and PhotoGallery
---

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

---
## Iteration 7 - 2026-05-08T16:59:36-03:00
**User Story**: US4 — Fila Pública de Atendimento
**Tasks Completed**: 
- [x] T071: src/server/queries/queue-public.ts — getPublicQueue(slug) with plate masking and estimated wait times
- [x] T072: src/app/api/fila-publica/[slug]/route.ts — public GET, 404 for unknown slug, rate limit 60 req/min/IP
- [x] T073: src/app/fila/[slug]/page.tsx — SSR initial fetch + PublicQueuePage client component for 30s polling
- [x] T074: src/components/queue/PublicQueueDisplay.tsx — two sections (Em Atendimento / Aguardando na Fila) + empty state
- [x] T075: src/components/queue/QueueCard.tsx — vehicle card with masked plate, status badge, estimated wait time
- [x] T076: src/components/queue/QueueRefreshTimer.tsx — 30s countdown, triggers refetch, shows last-updated timestamp
- [x] T077: src/app/fila/[slug]/not-found.tsx — "Lava-jato não encontrado" page for invalid slugs
**Tasks Remaining in Story**: None - story complete
**Commit**: c8c2f09
**Files Changed**: 
- src/server/queries/queue-public.ts
- src/app/api/fila-publica/[slug]/route.ts
- src/app/fila/[slug]/page.tsx
- src/app/fila/[slug]/PublicQueuePage.tsx
- src/app/fila/[slug]/not-found.tsx
- src/components/queue/PublicQueueDisplay.tsx
- src/components/queue/QueueCard.tsx
- src/components/queue/QueueRefreshTimer.tsx
**Learnings**:
- Tenant model uses `businessName` (not `name`) and has no `isActive` field
- QueueEntry.estimatedMinutes is optional; fall back to SUM(serviceType.estimatedMinutes * quantity) from OS items
- Public queue page splits into SSR page.tsx (initial fetch) + client PublicQueuePage.tsx (polling) pattern
- Rate limiting reuses the same sliding-window Redis pattern from auth endpoints (zrangebyscore + zadd + zcard)
---

---
## Iteration 9 - 2026-05-09T08:49:25-03:00
**User Story**: US6 — Orçamentos e Geração de PDF
**Tasks Completed**: 
- [x] T089: src/lib/validations/quote.ts — Zod schemas (create/update/item/statusTransition)
- [x] T090: src/server/services/quote.service.ts — createQuote, updateQuote, transitionQuoteStatus, convertToOS, getQuoteById, listQuotes
- [x] T091: src/lib/pdf/generator.ts — Playwright headless singleton, SEC-002 security (no file://, CSP, --disable-extensions)
- [x] T092: src/lib/pdf/quote-template.ts — renderQuoteHTML with DOMPurify sanitization (SEC-002)
- [x] T093: src/lib/jobs/quote-expiration.worker.ts — BullMQ daily cron worker
- [x] T094: src/app/api/orcamentos/route.ts — GET (list + status filter) + POST
- [x] T095: src/app/api/orcamentos/[id]/route.ts — GET + PATCH (update + status transition)
- [x] T096: src/app/api/orcamentos/[id]/pdf/route.ts — POST PDF generation, MinIO upload, binary stream
- [x] T097: src/app/api/orcamentos/[id]/converter/route.ts — POST convert-to-OS with idempotency guard
- [x] T098: src/app/(dashboard)/orcamentos/page.tsx — list with status tabs and create button
- [x] T099: src/app/(dashboard)/orcamentos/[id]/page.tsx — detail with status actions, PDF download, convert button
- [x] T100: src/components/forms/QuoteForm.tsx — multi-item form with live total calculation
**Tasks Remaining in Story**: None - story complete
**Commit**: b1a7427
**Files Changed**: 
- src/lib/validations/quote.ts
- src/server/services/quote.service.ts
- src/lib/pdf/generator.ts
- src/lib/pdf/quote-template.ts
- src/lib/jobs/quote-expiration.worker.ts
- src/app/api/orcamentos/route.ts
- src/app/api/orcamentos/[id]/route.ts
- src/app/api/orcamentos/[id]/pdf/route.ts
- src/app/api/orcamentos/[id]/converter/route.ts
- src/app/(dashboard)/orcamentos/page.tsx
- src/app/(dashboard)/orcamentos/[id]/page.tsx
- src/components/forms/QuoteForm.tsx
- specs/001-plataforma-lava-jato/tasks.md
**Learnings**:
- PDF streaming routes must NOT use `withErrorHandler` (returns binary not JSON ApiResponse); use try/catch with ApiError directly
- Prisma `Decimal` fields must be converted to `String()` before passing to template functions that expect `string | number`
- `new NextResponse(buffer, ...)` requires `new Uint8Array(buffer)` not raw `Buffer<ArrayBufferLike>` to satisfy BodyInit type
- `gross` variable was computed but unused in quote-template; only `discount` and `item.subtotal` needed
---

**User Story**: US5 — Controle de Estoque (P5)
**Tasks Completed**: 
- [x] T078: src/lib/validations/product.ts + src/lib/validations/stock-movement.ts — Zod schemas
- [x] T079: src/server/services/product.service.ts — CRUD, isLowStock derived field, deactivation guard
- [x] T080: src/server/services/stock.service.ts — recordMovement (weighted avg cost), listMovements
- [x] T081: src/app/api/inventario/route.ts — GET (lowStock filter) + POST
- [x] T082: src/app/api/inventario/[id]/route.ts — GET + PATCH + DELETE
- [x] T083: src/app/api/inventario/[id]/movimentacoes/route.ts — GET (period filter) + POST
- [x] T084: src/app/(dashboard)/inventario/page.tsx — list with red-highlighted low-stock rows + slide-out movement drawer
- [x] T085: src/components/forms/ProductForm.tsx — create/edit form
- [x] T086: src/components/forms/StockMovementForm.tsx — movement form with ENTRADA/SAIDA/AJUSTE radio selector
- [x] T087: src/components/shared/LowStockBadge.tsx — "Estoque Crítico" badge
- [x] T088: Integrated zero-stock inline alert into ServiceOrderForm for PRODUTO items
**Tasks Remaining in Story**: None - story complete
**Commit**: 34b9257
**Files Changed**: 
- src/lib/validations/product.ts
- src/lib/validations/stock-movement.ts
- src/server/services/product.service.ts
- src/server/services/stock.service.ts
- src/app/api/inventario/route.ts
- src/app/api/inventario/[id]/route.ts
- src/app/api/inventario/[id]/movimentacoes/route.ts
- src/app/(dashboard)/inventario/page.tsx
- src/components/forms/ProductForm.tsx
- src/components/forms/StockMovementForm.tsx
- src/components/shared/LowStockBadge.tsx
- src/components/forms/ServiceOrderForm.tsx
**Learnings**:
- Prisma Decimal fields are typed as `Decimal`, must explicitly type intermediate calculation variables as `number` when doing JS arithmetic
- lowStock column-to-column comparison (currentStock <= minimumStock) must be done in JS/application layer — Prisma v7 doesn't support raw column comparisons in findMany where clause
- ServiceOrderForm loads products via /api/inventario endpoint; zero-stock alert is display-only (non-blocking per spec)
---
