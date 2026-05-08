---
description: "Task list for FlowCar — Plataforma Micro-SaaS para Gestão de Lava-Jatos"
---

# Tasks: FlowCar — Plataforma Micro-SaaS para Gestão de Lava-Jatos

**Input**: Design documents from `/specs/001-plataforma-lava-jato/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.yaml ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US11=P0, US1=P1 … US10=P10)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Infraestrutura Compartilhada)

**Purpose**: Project initialization, Docker Compose stack, Next.js bootstrap, TypeScript config, and base types.

- [x] T001 Create `.env.example` with all required vars: DATABASE_URL, REDIS_URL, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, NEXT_PUBLIC_APP_URL
- [x] T002 Create `docker-compose.yml` with services: PostgreSQL 17, Redis 7, MinIO, and app with healthcheck pointing to `/api/health`
- [x] T003 [P] Create `Dockerfile` for Next.js 15 production build (multi-stage, non-root user)
- [x] T004 Initialize Next.js 15 project with TypeScript 5 strict mode and all dependencies in `package.json` (React 19, Prisma 7, Zod 4, Tailwind CSS 4, shadcn/ui, React Hook Form, TanStack React Query 5, jose, bcryptjs, ioredis, bullmq, twilio, @aws-sdk/client-s3, playwright, isomorphic-dompurify, @types/dompurify, pino)
- [x] T005 [P] Configure Tailwind CSS 4 and shadcn/ui in `tailwind.config.ts` and `components.json`
- [x] T006 [P] Configure ESLint and TypeScript strict mode in `eslint.config.js` and `tsconfig.json`
- [x] T007 [P] Create `src/types/api.ts` with standard API envelope types `{ success: true, data: T }` / `{ success: false, error: string }`

**Checkpoint**: Docker Compose stack runs; Next.js dev server starts without errors.

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRÍTICO**: Nenhuma user story pode começar até que esta fase esteja completa.

- [x] T008 Create `prisma/schema.prisma` with all entities from data-model.md: Tenant, User, CarWashConfig, Customer, Vehicle, ServiceType, Product, StockMovement, Quote, QuoteItem, Contract, ContractSignature, ServiceOrder, ServiceOrderItem, QueueEntry, FileUpload, WhatsAppNotification — including all enums, relations, and composite unique constraints
- [x] T009 Run initial Prisma migration and generate Prisma client (`prisma/migrations/`)
- [x] T010 [P] Create `src/lib/prisma.ts` with Prisma client singleton
- [x] T011 [P] Create `src/lib/logging/logger.ts` with pino structured JSON logger (fields: timestamp, level, module, tenantId, userId, message) — **[SEC-010]** define and export typed log helpers for the 6 required security events (Constitução §7.1): `logLoginSuccess(userId, tenantId)` INFO, `logLoginFailure(email, ip)` WARN (no password in log), `logAccessDenied(route, userId, ip)` WARN, `logFileUpload(tenantId, type, size)` INFO, `logContractSigned(contractId, tenantId, ip)` INFO, `logTenantCreated(tenantId, slug)` INFO
- [x] T012 [P] Create `src/lib/utils.ts` with shared utilities: `generateSequentialNumber` (OS-XXXX, ORC-XXXX, CTR-XXXX), `generateUUID`, `maskPlate` (ABC-**34), `slugify`, and API response helpers `ok()` / `fail()` — **[SEC-011]** `generateSequentialNumber` MUST use an atomic DB-level query (`SELECT MAX(number) + 1 ... FOR UPDATE` inside a Prisma transaction, or a PostgreSQL sequence per tenant) to guarantee uniqueness under concurrent requests; never use `MAX + 1` without a transaction lock
- [x] T013 [P] Create `src/lib/validations/common.ts` with base Zod schemas: slug (`[a-z0-9-]+`), brazilianPhone, cpfCnpj, paginationQuery, fileUpload (type + size)
- [x] T014 Create `src/lib/auth/jwt.ts` with jose JWT access token creation (15 min expiry) and verification (returns `{ userId, tenantId, role }`)
- [x] T015 Create `src/lib/auth/redis.ts` with ioredis client, refresh token storage/retrieval/revocation (`auth:refresh:{tokenId}`), user token set management (`auth:user:{userId}:tokens`), and sliding-window rate limiting (`auth:login:attempts:{ip}`)
- [x] T016 [P] Create `src/lib/storage/s3.ts` with `@aws-sdk/client-s3` client configured via env vars pointing to MinIO
- [x] T017 [P] Create `src/lib/storage/upload.ts` with file type/size validation (JPG, PNG, WEBP, PDF ≤ 10 MB), S3 `PutObject` upload using `{tenantId}/{category}/{uuid}.{ext}` key pattern, and pre-signed URL generation (max 1 hour) — **[SEC-001]** validate file type via magic bytes (first bytes of buffer: JPEG `FF D8 FF`, PNG `89 50 4E 47`, WEBP `52 49 46 46…57 45 42 50`, PDF `25 50 44 46`); reject with HTTP 422 if magic bytes do not match declared MIME — never trust `Content-Type` header alone
- [x] T018 Create `src/middleware.ts` with JWT auth enforcement on protected routes, tenant context extraction from token, and RBAC route guard (FUNCIONARIO blocked from `/funcionarios/*`, `/contratos/*`, `/relatorios/*`, `/configuracoes/*`)
- [x] T019 [P] Create `src/server/policies/rbac.ts` with `requireRole(role)` and `assertTenantOwnership(tenantId, session)` helper functions for use in Route Handlers — **[SEC-007]** `assertTenantOwnership` MUST throw `NotFoundError` (HTTP 404, not 403) when a resource does not belong to the session tenant, to prevent cross-tenant resource enumeration; returning 403 would reveal that the resource exists under a different tenant
- [x] T020 Create `src/app/api/health/route.ts` GET `/api/health` (no auth) checking PostgreSQL (`$queryRaw SELECT 1`) and MinIO (`HeadBucket`) — returns 200 healthy or 503 degraded in under 5 s
- [x] T020a [P] **[SEC-003]** Configure HTTP security headers in `next.config.ts` via `headers()` export: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and base `Content-Security-Policy` (same-origin for scripts/styles; MinIO endpoint for images; `upgrade-insecure-requests`) — applied to all routes (`source: '/(.*)'`)
- [x] T021 [P] Create `src/app/error.tsx` client error boundary and `src/lib/api-error.ts` with typed API error classes (`ApiError`, `NotFoundError`, `ForbiddenError`, `UnprocessableError`) and global error handler wrapper for Route Handlers

**Checkpoint**: Foundation ready — `/api/health` returns 200; Prisma migrations applied; all shared lib files compile without errors.

---

## Phase 3: User Story 11 — Cadastro e Onboarding de Novo Lava-Jato (Prioridade: P0) 🎯 MVP Base

**Goal**: Multi-tenant foundation — a proprietário registers a new lava-jato and is automatically set as GERENTE of their isolated tenant. Onboarding checklist tracks initial setup steps.

**Independent Test**: Register two separate lava-jatos, create data in each, and verify that API list endpoints for one tenant return zero records from the other.

- [x] T022 [P] [US11] Create `src/lib/validations/tenant.ts` with tenant registration Zod schema (businessName, slug, ownerName, email, password)
- [x] T023 [P] [US11] Create `src/server/services/tenant.service.ts` with `createTenant` — atomic transaction: insert Tenant + GERENTE User (bcrypt 12 rounds); slug uniqueness conflict returns "slug já está em uso" without exposing DB error — **[SEC-010]** calls `logTenantCreated(tenantId, slug)` after successful commit
- [x] T024 [US11] Create `src/app/api/tenants/route.ts` POST `/api/tenants` — public endpoint calling `createTenant`; slug validation with `[a-z0-9-]` regex; returns created tenant and user — **[SEC-004]** apply Redis sliding-window rate limiting (same mechanism as T015) before processing: max 10 registrations per IP per hour to prevent automated bulk tenant creation
- [x] T025 [US11] Create `src/app/(auth)/cadastro/page.tsx` tenant registration page (SSR, redirect to dashboard if already authenticated)
- [x] T026 [US11] Create `src/components/forms/RegisterForm.tsx` registration form with React Hook Form + Zod: businessName, slug, ownerName, email, password, confirmPassword — inline slug validation feedback
- [x] T027 [P] [US11] Create `src/lib/validations/user.ts` with employee create/update Zod schemas (name, email, password, role, phone)
- [x] T028 [P] [US11] Create `src/server/services/user.service.ts` with employee CRUD: list (filtered by tenantId), create (bcrypt 12 rounds), update, deactivate (revokes all Redis refresh tokens immediately)
- [x] T029 [US11] Create `src/app/api/funcionarios/route.ts` GET + POST employee endpoints (GERENTE only, scoped to session tenantId)
- [x] T030 [US11] Create `src/app/api/funcionarios/[id]/route.ts` GET + PATCH + DELETE employee endpoints (GERENTE only, assert tenantId ownership)
- [x] T031 [US11] Create `src/server/queries/onboarding.ts` — `getOnboardingState(tenantId)` returning `{ slugConfigured, hasServiceType, hasEmployee }` derived from DB facts (no dedicated table)

**Checkpoint**: POST `/api/tenants` creates isolated tenant; two tenants' data does not cross-contaminate in any list endpoint.

---

## Phase 4: User Story 1 — Autenticação e Controle de Acesso por Papel (Prioridade: P1)

**Goal**: Authenticated sessions with GERENTE/FUNCIONARIO RBAC. Login issues short-lived access token + HttpOnly refresh token cookie. Role-based UI filtering and route protection.

**Independent Test**: Create two tenants via seed; login with GERENTE → all menu items visible; login with FUNCIONARIO → Funcionários, Contratos, Relatórios, Configurações hidden and URL-direct access returns 403.

- [x] T032 [P] [US1] Create `src/lib/validations/auth.ts` with loginRequest, refreshRequest, and tokenResponse Zod schemas
- [x] T033 [P] [US1] Create `src/server/services/auth.service.ts` with `login` (rate limit check → email lookup → bcrypt verify → issue access + refresh tokens), `logout` (revoke refresh token from Redis), and `refreshToken` (validate stored token → rotate → issue new pair) — **[SEC-010]** `login` calls `logLoginSuccess` on success and `logLoginFailure` on invalid credentials (never log password or expose timing difference between "user not found" and "wrong password")
- [x] T034 [US1] Create `src/app/api/auth/login/route.ts` POST `/api/auth/login` — calls auth.service login; on success sets HttpOnly refresh token cookie and returns access token in body; on failure returns generic "Credenciais inválidas."; rate limit exceeded returns 429 — **[SEC-005]** cookie attributes MUST be: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800` — `Secure` ensures HTTPS-only transmission; `SameSite=Strict` prevents CSRF on the refresh endpoint
- [x] T035 [US1] Create `src/app/api/auth/logout/route.ts` POST `/api/auth/logout` — revokes refresh token from Redis; clears cookie
- [x] T036 [US1] Create `src/app/api/auth/refresh/route.ts` POST `/api/auth/refresh` — reads refresh token cookie; validates against Redis; returns new access token
- [x] T037 [US1] Create `src/app/(auth)/login/page.tsx` login page (SSR, redirect to dashboard if authenticated)
- [x] T038 [US1] Create `src/components/forms/LoginForm.tsx` login form with React Hook Form + Zod; displays error without revealing which field is wrong
- [x] T039 [P] [US1] Create `src/components/shared/Sidebar.tsx` dashboard sidebar with navigation items filtered by user role (FUNCIONARIO excludes Funcionários, Contratos, Relatórios, Configurações)
- [x] T040 [US1] Create `src/app/(dashboard)/layout.tsx` dashboard layout with server-side auth guard (redirect to `/login` if no valid session), session provider, and Sidebar
- [x] T041 [US1] Create `src/app/(dashboard)/funcionarios/page.tsx` employee management page (GERENTE only) — lists employees with create/edit/deactivate actions
- [x] T042 [P] [US1] Create `src/components/shared/RBACGuard.tsx` client-side component that renders children only when user role matches required role
- [x] T043 [US1] Create `src/components/forms/EmployeeForm.tsx` employee create/edit form (name, email, password, role, phone)

**Checkpoint**: Login flow complete; RBAC enforced in middleware AND UI; cross-tenant session isolation verified.

---

## Phase 5: User Story 2 — Gestão de Clientes e Veículos (Prioridade: P2)

**Goal**: GERENTE and FUNCIONARIO can manage customers and associate multiple vehicles. Plate uniqueness enforced per tenant. Deactivation blocked when active orders or contracts exist.

**Independent Test**: Register a customer, add two vehicles, verify plate uniqueness within the tenant (same plate in a different tenant is allowed), edit vehicle, search by name/phone.

- [x] T044 [P] [US2] Create `src/lib/validations/customer.ts` with customer create/update Zod schemas (name, email, phone, whatsappPhone, cpfCnpj, address; all optional except name)
- [x] T045 [P] [US2] Create `src/lib/validations/vehicle.ts` with vehicle create/update Zod schemas (plate normalized to uppercase, brand, model, year, color, customerId)
- [x] T046 [P] [US2] Create `src/server/services/customer.service.ts` with list (search by name/phone), getById, create, update, and `deactivate` — deactivation blocked if active OS (AGUARDANDO/EM_ANDAMENTO) or AGUARDANDO_ASSINATURA contracts exist; error lists impeding records — **[SEC-009]** `list()` returns `cpfCnpj` masked (`***.456.789-**` for CPF, `**.345.678/0001-**` for CNPJ) as required by Constitução §3.2 (LGPD); `getById()` returns the full unmasked value
- [x] T047 [P] [US2] Create `src/server/services/vehicle.service.ts` with list by customerId, getById, create (enforce `(tenantId, plate)` uniqueness), update, and deactivate (blocked if active OS)
- [x] T048 [US2] Create `src/app/api/clientes/route.ts` GET (list + search query param) + POST customer endpoints — **[SEC-009]** GET list responses use `customer.service.list()` which returns masked CPF/CNPJ; POST create returns the new record with masked CPF/CNPJ in response body
- [x] T049 [US2] Create `src/app/api/clientes/[id]/route.ts` GET + PATCH + DELETE customer endpoints (assert tenantId ownership)
- [x] T050 [US2] Create `src/app/api/veiculos/route.ts` GET (list by customerId) + POST vehicle endpoints
- [x] T051 [US2] Create `src/app/api/veiculos/[id]/route.ts` GET + PATCH + DELETE vehicle endpoints (assert tenantId ownership)
- [x] T052 [P] [US2] Create `src/app/(dashboard)/clientes/page.tsx` customers list page with real-time search input (debounced) and create button
- [x] T053 [US2] Create `src/app/(dashboard)/clientes/[id]/page.tsx` customer detail page showing customer info and linked vehicles list with add/edit/deactivate actions
- [x] T054 [US2] Create `src/components/forms/CustomerForm.tsx` customer create/edit form (React Hook Form + Zod, all fields including optional whatsappPhone)
- [x] T055 [US2] Create `src/components/forms/VehicleForm.tsx` vehicle create/edit form with plate auto-uppercase normalization

**Checkpoint**: Customer CRUD functional; plate uniqueness per tenant enforced; deactivation block working with clear error message.

---

## Phase 6: User Story 3 — Ordens de Serviço e Fila Interna (Prioridade: P3)

**Goal**: Employees create service orders, manage status transitions, and upload service photos. Queue positions auto-recalculate on every addition or removal.

**Independent Test**: Create OS for a vehicle, move to EM_ANDAMENTO (verify startedAt), move to CONCLUÍDO (verify queue recalculation), upload photo (verify pre-signed URL access).

- [ ] T056 [P] [US3] Create `src/lib/validations/service-order.ts` with OS create, update, status transition, and item (service/product) Zod schemas
- [ ] T057 [P] [US3] Create `src/server/services/queue.service.ts` with `insertQueueEntry`, `promoteToInProgress`, `removeFromQueue`, and `resequencePositions` — dense sequential positions for AGUARDANDO entries; EM_ANDAMENTO entries get `position = null`
- [ ] T058 [P] [US3] Create `src/server/services/service-order.service.ts` with: `createOS` (blocks if vehicle has active OS, generates OS-XXXX number, inserts QueueEntry), `transitionStatus` (AGUARDANDO→EM_ANDAMENTO records startedAt; EM_ANDAMENTO→CONCLUIDO records completedAt + removes QueueEntry; any→CANCELADO records cancelledAt + removes QueueEntry; all removals trigger resequence), `addItem`, `removeItem`, `getById`, `list`
- [ ] T059 [US3] Create `src/app/api/ordens-servico/route.ts` GET (list with status/date/client filters) + POST OS endpoints
- [ ] T060 [US3] Create `src/app/api/ordens-servico/[id]/route.ts` GET + PATCH OS endpoints (assert tenantId ownership)
- [ ] T061 [US3] Create `src/app/api/ordens-servico/[id]/status/route.ts` PATCH status transition endpoint
- [ ] T062 [US3] Create `src/app/api/ordens-servico/[id]/items/route.ts` POST (add item) + DELETE by itemId endpoints
- [ ] T063 Create `src/app/api/uploads/route.ts` POST `/api/uploads` — validates file type/size (frontend validation doubles as safeguard: backend returns 422 on violation), stores to MinIO with `{tenantId}/{categoria}/{uuid}.{ext}`, persists FileUpload record — **[SEC-001]** calls T017 magic bytes validation before any storage operation; rejects if magic bytes mismatch even when `Content-Type` appears valid — **[SEC-010]** calls `logFileUpload(tenantId, type, size)` after successful MinIO upload
- [ ] T064 [P] [US3] Create `src/app/(dashboard)/ordens-servico/page.tsx` OS list page with status filter tabs and create button
- [ ] T065 [US3] Create `src/app/(dashboard)/ordens-servico/nova/page.tsx` new OS form page (client/vehicle selector, service/product item rows)
- [ ] T066 [US3] Create `src/app/(dashboard)/ordens-servico/[id]/page.tsx` OS detail page with status action buttons, items list, and photos gallery
- [ ] T067 [US3] Create `src/components/forms/ServiceOrderForm.tsx` OS form with client/vehicle async search, multi-item rows (serviceType or product selector, qty, price), and total calculation
- [ ] T068 [US3] Create `src/components/shared/FileUpload.tsx` reusable upload component with frontend type/size validation, progress indicator, and error display
- [ ] T069 [US3] Create `src/components/shared/PhotoGallery.tsx` photo gallery component fetching pre-signed URLs on demand
- [ ] T070 [US3] Create `src/server/queries/queue-internal.ts` query for internal queue management view (all active entries ordered by position)

**Checkpoint**: Full OS lifecycle working; queue resequences after every status change; photos uploaded to MinIO and accessible via pre-signed URLs only.

---

## Phase 7: User Story 4 — Fila Pública de Atendimento (Prioridade: P4)

**Goal**: Anonymous clients view real-time queue status at a public URL. Two groups: "Em Atendimento" (EM_ANDAMENTO, no position) and "Aguardando" (sequential positions). Auto-refreshes every 30 seconds.

**Independent Test**: Configure slug, create 3 AGUARDANDO and 1 EM_ANDAMENTO orders, access `/fila/{slug}` anonymously — verify plate masking, correct group assignment, estimated times, and 30-second polling.

- [ ] T071 [P] [US4] Create `src/server/queries/queue-public.ts` — `getPublicQueue(slug)`: looks up tenant by slug, queries active QueueEntries with their OS and vehicle data; groups into EM_ANDAMENTO (label "Em Atendimento", no position) and AGUARDANDO (sequential 1,2,3…); masks plate (ABC-**34); calculates estimated time per AGUARDANDO entry using `SUM(serviceMinutes of entries ahead) / simultaneousSlots`
- [ ] T072 [US4] Create `src/app/api/fila-publica/[slug]/route.ts` GET public endpoint (no auth) returning queue JSON; returns 404 for unknown slug — **[SEC-004]** apply Redis rate limiting: max 60 requests per IP per minute to prevent abusive polling beyond the 30 s frontend interval; return 429 on excess
- [ ] T073 [US4] Create `src/app/fila/[slug]/page.tsx` SSR public queue page — fetches initial data server-side; client component handles 30-second polling interval
- [ ] T074 [US4] Create `src/components/queue/PublicQueueDisplay.tsx` container rendering two sections ("Em Atendimento" and "Aguardando na Fila") and empty-state message when queue has no active vehicles
- [ ] T075 [US4] Create `src/components/queue/QueueCard.tsx` individual vehicle card showing masked plate, status badge, and estimated wait time
- [ ] T076 [US4] Create `src/components/queue/QueueRefreshTimer.tsx` 30-second countdown component that triggers data refetch and displays last-updated timestamp
- [ ] T077 [US4] Create `src/app/fila/[slug]/not-found.tsx` "Lava-jato não encontrado" page for invalid slug

**Checkpoint**: `/fila/{slug}` publicly accessible without auth; plates masked; estimated times computed correctly; page auto-refreshes every 30 s.

---

## Phase 8: User Story 5 — Controle de Estoque (Prioridade: P5)

**Goal**: Manage product catalog with inventory tracking. Movements are immutable audit trail. Visual alert for items at or below minimum stock. Zero-stock items allowed in OS with warning.

**Independent Test**: Create product with minimumStock=5; register exit movements until currentStock≤5; verify low-stock highlight without page reload.

- [ ] T078 [P] [US5] Create `src/lib/validations/product.ts` with product create/update Zod schemas and `src/lib/validations/stock-movement.ts` with movement Zod schema (type, quantity, reason, serviceOrderId?)
- [ ] T079 [P] [US5] Create `src/server/services/product.service.ts` with product CRUD; `isLowStock` derived field (`currentStock <= minimumStock`); deactivation guard (blocks if referenced in active OS items)
- [ ] T080 [P] [US5] Create `src/server/services/stock.service.ts` with `recordMovement` (immutable StockMovement insert + updates `Product.currentStock`; ENTRADA recalculates `costPrice` weighted average), `listMovements` (filterable by product/period)
- [ ] T081 [US5] Create `src/app/api/inventario/route.ts` GET (list with optional `lowStock=true` filter) + POST product endpoints
- [ ] T082 [US5] Create `src/app/api/inventario/[id]/route.ts` GET + PATCH + DELETE product endpoints (assert tenantId ownership)
- [ ] T083 [US5] Create `src/app/api/inventario/[id]/movimentacoes/route.ts` GET movement history (filterable by period) + POST new movement
- [ ] T084 [P] [US5] Create `src/app/(dashboard)/inventario/page.tsx` inventory list page with low-stock highlight row styling, movement history expandable drawer, and create/edit product actions
- [ ] T085 [US5] Create `src/components/forms/ProductForm.tsx` product create/edit form (name, unit, currentStock, minimumStock, costPrice)
- [ ] T086 [US5] Create `src/components/forms/StockMovementForm.tsx` stock movement form with type selector (ENTRADA/SAÍDA/AJUSTE), quantity, reason
- [ ] T087 [US5] Create `src/components/shared/LowStockBadge.tsx` visual low-stock badge component (shows "Estoque Crítico" when `currentStock <= minimumStock`)
- [ ] T088 [US5] Integrate zero-stock warning into `src/components/forms/ServiceOrderForm.tsx` — when adding a product item with `currentStock <= 0`, display inline alert "Estoque zerado" (operation is not blocked)

**Checkpoint**: Product CRUD; movement history immutable; low-stock badge appears immediately on list page; zero-stock warning shown in OS form without blocking.

---

## Phase 9: User Story 6 — Orçamentos e Geração de PDF (Prioridade: P6)

**Goal**: GERENTE creates quotes with items, discounts, and expiry date. PDF generated via Playwright headless. APROVADO quotes convertible to OS (single-conversion enforced). Daily BullMQ job expires stale quotes.

**Independent Test**: Create quote with 2 items and a discount, generate PDF (verify < 5 s for ≤ 20 items), convert to OS (verify second conversion is blocked with reference to existing OS).

- [ ] T089 [P] [US6] Create `src/lib/validations/quote.ts` with quote create/update Zod schemas (customerId, vehicleId, validUntil required, items[]), item schema (serviceTypeId, description, quantity, unitPrice, discountAmount), and status transition schemas
- [ ] T090 [P] [US6] Create `src/server/services/quote.service.ts` with: `createQuote` (generates ORC-XXXX, calculates item subtotals and total), `updateQuote`, `transitionStatus` (RASCUNHO→ENVIADO records sentAt; ENVIADO→APROVADO records approvedAt; any→REJEITADO records rejectedAt), `convertToOS` (only if APROVADO; blocks if `convertedOrderId` already set — returns existing OS reference; creates OS pre-filled with quote items, sets convertedOrderId)
- [ ] T091 Create `src/lib/pdf/generator.ts` reusable Playwright headless HTML-to-PDF function `generatePDF(htmlContent: string): Promise<Buffer>` — launches browser once per process (singleton); configures print CSS; validates < 5 s for 20-item documents — **[SEC-002]** launch Playwright with `--disable-extensions`, no `file://` URL access; apply inline CSP header in rendered page blocking external scripts and network requests from the headless browser
- [ ] T092 Create `src/lib/pdf/quote-template.ts` HTML template function `renderQuoteHTML(quote, items, customer)` returning complete HTML string styled for print (company header, client info, itemized table with discounts, subtotal, total) — **[SEC-002]** all user-supplied fields interpolated into HTML (item descriptions, customer name/address) MUST be escaped via `isomorphic-dompurify` or equivalent before interpolation to prevent HTML injection in the rendered PDF
- [ ] T093 [US6] Create `src/lib/jobs/quote-expiration.worker.ts` BullMQ worker `quote-expiration` — runs daily cron; queries all quotes where `validUntil < now` AND status NOT IN (APROVADO, REJEITADO, EXPIRADO); bulk-updates to EXPIRADO
- [ ] T094 [US6] Create `src/app/api/orcamentos/route.ts` GET (list with status filter) + POST quote endpoints
- [ ] T095 [US6] Create `src/app/api/orcamentos/[id]/route.ts` GET + PATCH quote endpoints (assert tenantId ownership)
- [ ] T096 [US6] Create `src/app/api/orcamentos/[id]/pdf/route.ts` POST — renders quote via Playwright, uploads PDF to MinIO, updates `quote.pdfFileId`, streams PDF download with `Content-Disposition: attachment`
- [ ] T097 [US6] Create `src/app/api/orcamentos/[id]/converter/route.ts` POST — calls `quote.service.convertToOS`; returns new OS or error with existing OS reference
- [ ] T098 [P] [US6] Create `src/app/(dashboard)/orcamentos/page.tsx` quotes list page with status filter tabs and create button
- [ ] T099 [US6] Create `src/app/(dashboard)/orcamentos/[id]/page.tsx` quote detail page with status action buttons, PDF download button, and "Converter em OS" button (visible only when APROVADO)
- [ ] T100 [US6] Create `src/components/forms/QuoteForm.tsx` quote form with client/vehicle selectors, multi-item rows (serviceType, description, qty, unit price, discount), validUntil date picker, and live total calculation

**Checkpoint**: PDF generated and downloadable (< 5 s); quote-to-OS conversion enforces single-conversion; daily expiration job transitions stale quotes.

---

## Phase 10: User Story 7 — Contratos e Assinatura Digital (Prioridade: P7)

**Goal**: GERENTE creates contracts and sends a public signing link (valid 7 days). Client signs digitally via canvas pad from a public page (no auth). Signed contract generates PDF with embedded signature.

**Independent Test**: Create contract, generate signing link, access link in anonymous tab, sign via canvas pad, verify status changes to ASSINADO, download PDF with signature. Verify expired link blocks signing.

- [ ] T101 [P] [US7] Create `src/lib/validations/contract.ts` with contract create/update Zod schemas (customerId, title, contentHtml), public signing submission schema (signatureDataUrl), and link regeneration schema
- [ ] T102 [P] [US7] Create `src/server/services/contract.service.ts` with: `createContract` (generates CTR-XXXX), `generateSigningLink` (creates crypto-random token, stores only SHA-256 hash in `publicTokenHash`, sets `publicLinkExpiresAt = now + 7 days`, transitions to AGUARDANDO_ASSINATURA), `regenerateLink` (**[SEC-015]** available ONLY when `status === AGUARDANDO_ASSINATURA`; blocked for RASCUNHO, ASSINADO, and CANCELADO), `signContract` (validates token hash + expiry; **[SEC-008]** MUST execute inside `prisma.$transaction`: reads contract with status check (`status === AGUARDANDO_ASSINATURA`) atomically before writing; if already ASSINADO by the time the transaction runs, returns HTTP 409 to prevent double-signing race condition; creates ContractSignature with signatureFileId + signedIp + signedUserAgent; transitions to ASSINADO; invalidates token) — **[SEC-010]** `signContract` calls `logContractSigned(contractId, tenantId, signedIp)` after successful commit
- [ ] T103 Create `src/lib/pdf/contract-template.ts` HTML template function `renderContractHTML(contract, customer, signature)` with contract content, signature image (base64 embedded), signer IP masked display, and signing timestamp — **[SEC-002]** `contentHtml` is untrusted rich text entered by GERENTE; MUST be sanitized with `isomorphic-dompurify` (allowlist: block `<script>`, `<iframe>`, `<object>`, `<embed>`, event attributes) before rendering; `signedIp` displayed masked (e.g. `189.xxx.xxx.12`), never in full
- [ ] T104 [US7] Create `src/app/api/contratos/route.ts` GET (list with status filter, GERENTE only) + POST contract endpoints
- [ ] T105 [US7] Create `src/app/api/contratos/[id]/route.ts` GET + PATCH contract endpoints (GERENTE only, assert tenantId)
- [ ] T106 [US7] Create `src/app/api/contratos/[id]/link/route.ts` POST — generates or regenerates public signing link (GERENTE only); returns public URL
- [ ] T107 [US7] Create `src/app/api/contratos/publico/[token]/route.ts` GET (returns contract content if token valid and not expired/already-signed) + POST (submits signature data, stores signature image to MinIO as ASSINATURA_CONTRATO category, calls signContract); both endpoints require NO authentication — **[SEC-004]** apply Redis rate limiting on POST: max 10 attempts per IP per hour to prevent DoS on the signing endpoint — **[SEC-006]** implement double-submit CSRF protection: GET returns a short-lived CSRF token in a `Set-Cookie: csrf_token=...; SameSite=Strict; Secure` header; POST validates matching `X-CSRF-Token` header before processing the signature — **[SEC-012]** capture `signedIp` from `X-Forwarded-For` last trusted IP (configured via `TRUSTED_PROXY_IPS`) or `req.socket.remoteAddress` when no proxy is present
- [ ] T108 [US7] Create `src/app/api/contratos/[id]/pdf/route.ts` POST (GERENTE only) — renders signed contract via Playwright, uploads to MinIO, updates `contract.pdfFileId`, streams PDF download
- [ ] T109 [P] [US7] Create `src/app/(dashboard)/contratos/page.tsx` contracts list page (GERENTE only) with status filter and create button
- [ ] T110 [US7] Create `src/app/(dashboard)/contratos/[id]/page.tsx` contract detail page with link management (generate/regenerate), status display, and PDF download (GERENTE only)
- [ ] T111 [US7] Create `src/app/contratos/assinar/[token]/page.tsx` public contract signing page (no auth, SSR) — shows contract content and SignaturePad when link is valid; shows expiry/already-signed message otherwise
- [ ] T112 [US7] Create `src/components/forms/ContractForm.tsx` contract create/edit form with rich-text contentHtml textarea and client selector
- [ ] T113 [US7] Create `src/components/shared/SignaturePad.tsx` canvas-based digital signature pad component with clear button and submit; outputs signature as PNG data URL

**Checkpoint**: Full signing flow works end-to-end in anonymous tab; expired link shows appropriate message; signed contract PDF embeds signature image.

---

## Phase 11: User Story 8 — Relatórios e Dashboard com KPIs (Prioridade: P8)

**Goal**: GERENTE sees real-time KPIs on dashboard (day revenue, open/completed OS, critical stock). Reports filterable by period: revenue, top services, top clients, stock movements. Onboarding checklist widget shown for new tenants.

**Independent Test**: Using seed data (20 OS per tenant), verify dashboard KPIs match expected counts; apply a date range filter on the revenue report and verify results narrow correctly.

- [ ] T114 [P] [US8] Create `src/server/queries/dashboard.ts` with KPI aggregation queries: `getDayRevenue(tenantId)`, `getOpenOrdersCount(tenantId)`, `getMonthCompletedCount(tenantId)`, `getCriticalStockCount(tenantId)`
- [ ] T115 [P] [US8] Create `src/server/queries/reports.ts` with filterable report queries (all accept `{ tenantId, from, to }`): `getRevenueReport`, `getTopServices`, `getTopCustomers`, `getStockMovementsReport`
- [ ] T116 [US8] Create `src/app/api/relatorios/route.ts` GET endpoint with `type` (revenue | services | customers | stock) and `from`/`to` date query params; GERENTE only
- [ ] T117 [US8] Create `src/app/(dashboard)/page.tsx` main dashboard page (SSR) with KPI cards, recent OS summary table, and `OnboardingChecklist` widget (auto-hidden when all 3 tasks complete)
- [ ] T118 [P] [US8] Create `src/app/(dashboard)/relatorios/page.tsx` reports page with period range picker (DateRangePicker), report type selector, and results rendered in DataTable
- [ ] T119 [US8] Create `src/components/dashboard/KPICard.tsx` KPI display card (label, value, icon, trend)
- [ ] T120 [US8] Create `src/components/dashboard/OnboardingChecklist.tsx` onboarding checklist widget — fetches `getOnboardingState`, renders 3 checkbox items; disappears when all 3 are true

**Checkpoint**: Dashboard KPIs match seed data totals; reports filter correctly by period; onboarding checklist hides after all 3 tasks complete.

---

## Phase 12: User Story 9 — Configurações do Sistema (Prioridade: P9)

**Goal**: GERENTE configures lava-jato profile (name, slug, simultaneousSlots, address, phone, logo) and manages ServiceTypes (name, basePrice, estimatedMinutes). Slug change propagates to public queue URL.

**Independent Test**: Change slug and verify public queue URL responds at new slug. Add a ServiceType and verify it appears in OS/Quote form dropdowns immediately.

- [ ] T121 [P] [US9] Create `src/lib/validations/settings.ts` with CarWashConfig update Zod schema (slug `[a-z0-9-]`, simultaneousSlots ≥ 1, phone, address, logoFileId) and ServiceType create/update schema (name, basePrice ≥ 0, estimatedMinutes > 0)
- [ ] T122 [P] [US9] Create `src/server/services/settings.service.ts` with: `getConfig(tenantId)`, `upsertConfig` (updates Tenant.slug with uniqueness guard + updates CarWashConfig), `uploadLogo` (validates image, stores to MinIO as LOGOTIPO category, updates CarWashConfig.logoFileId), `listServiceTypes`, `createServiceType`, `updateServiceType`, `deactivateServiceType`
- [ ] T123 [US9] Create `src/app/api/configuracoes/route.ts` GET + PATCH CarWashConfig endpoints (GERENTE only)
- [ ] T124 [US9] Create `src/app/api/configuracoes/tipos-servico/route.ts` GET (all active, no auth restriction) + POST ServiceType endpoints (GERENTE only for POST)
- [ ] T125 [US9] Create `src/app/api/configuracoes/tipos-servico/[id]/route.ts` PATCH + DELETE ServiceType endpoints (GERENTE only)
- [ ] T126 [P] [US9] Create `src/app/(dashboard)/configuracoes/page.tsx` settings page (GERENTE only) with CarWashConfig form, logo uploader, and ServiceType management table
- [ ] T127 [US9] Create `src/components/forms/CarWashConfigForm.tsx` carwash settings form with all fields and logo FileUpload component
- [ ] T128 [US9] Create `src/components/forms/ServiceTypeForm.tsx` service type create/edit form (name, basePrice, estimatedMinutes)

**Checkpoint**: Slug change immediately reflected in public queue URL; ServiceType appears in OS/Quote selectors; simultaneousSlots change updates queue time estimates.

---

## Phase 13: User Story 10 — Features Extras: WhatsApp + Operações em Lote (Prioridade: P10)

**Goal**: (1) Clients receive automatic WhatsApp notifications on queue position change or OS completion/cancellation via Twilio + BullMQ. (2) GERENTE can multi-select orders for batch actions, apply advanced filters, and export CSV.

**Independent Test US10.1**: Register customer with `whatsappPhone`, create OS, transition to CONCLUIDO — verify WhatsAppNotification record created with status ENVIADA (or FALHA if Twilio creds not configured). **Independent Test US10.2**: Apply date+status filters on OS list, multi-select 3 orders, batch-update status — verify all 3 updated. Export CSV — verify download contains filtered rows.

- [ ] T129 [P] [US10] Create `src/lib/jobs/whatsapp.worker.ts` BullMQ worker `whatsapp-notifications` — processes `WhatsAppNotification` jobs: calls Twilio WhatsApp API (`twilio` npm), updates `status` to ENVIADA (with `providerMessageId`) or FALHA (with `lastError`); increments `attempts`; max retry configurable via BullMQ backoff
- [ ] T130 [P] [US10] Create `src/server/services/whatsapp.service.ts` with `enqueueNotification(tenantId, customerId, serviceOrderId, event)` — reads `Customer.whatsappPhone`; if set, creates `WhatsAppNotification` record (PENDENTE) and enqueues BullMQ job; no-op if whatsappPhone is null — **[SEC-013]** BullMQ job payload MUST contain ONLY `{ notificationId }` (the UUID of the WhatsAppNotification record); the worker (T129) reads all data — including `targetPhone` — directly from the database via `notificationId`; never include PII in the Redis job payload
- [ ] T131 [US10] Integrate `whatsapp.service.enqueueNotification` into `src/server/services/service-order.service.ts` on status transitions to CONCLUIDO and CANCELADO, and into `src/server/services/queue.service.ts` on `resequencePositions` (fires FILA_ATUALIZADA event for all affected customers with whatsappPhone)
- [ ] T132 [P] [US10] Create `src/lib/validations/batch.ts` with batch OS action Zod schema (`{ ids: string[], action: 'update_status' | 'assign_user', payload: object }`)
- [ ] T133 [US10] Create `src/app/api/ordens-servico/batch/route.ts` POST batch update endpoint (GERENTE only) — validates ids belong to tenant, applies action to all, returns `{ affected: N }`
- [ ] T134 [US10] Update `src/app/(dashboard)/ordens-servico/page.tsx` to add: advanced filter panel (date range, client, status, serviceType), multi-select row checkboxes, and `BatchActionToolbar` shown when ≥1 rows selected
- [ ] T135 [US10] Create `src/app/api/relatorios/export/route.ts` GET CSV export endpoint (GERENTE only) — accepts same `type`, `from`, `to` params as `/api/relatorios`; streams CSV with `Content-Disposition: attachment; filename="relatorio.csv"`
- [ ] T136 [US10] Update `src/app/(dashboard)/relatorios/page.tsx` to add "Exportar CSV" button that calls GET `/api/relatorios/export` with current filter params and triggers browser download
- [ ] T137 [US10] Create `src/components/shared/BatchActionToolbar.tsx` multi-select batch action toolbar component (visible when ≥1 rows selected, shows count, action dropdown, confirm button)

**Checkpoint**: WhatsApp notification enqueued on OS CONCLUIDO for customers with whatsappPhone; batch status update applies to all selected OS; CSV export downloads correct rows.

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Seed data, README, shared components, TanStack Query setup, BullMQ bootstrap, and final validation.

- [ ] T138 [P] Create `prisma/seed.ts` with 2 tenants (with distinct slugs), per tenant: 1 GERENTE + 2 FUNCIONARIOs (bcrypt 12 rounds), 10 products, 8 service types, 15 customers (with vehicles), 20 vehicles, 5 quotes (mixed statuses), 3 contracts (1 ASSINADO, 1 AGUARDANDO_ASSINATURA, 1 RASCUNHO), 20 OS (mixed statuses including CONCLUIDO/EM_ANDAMENTO/AGUARDANDO), and CarWashConfig with demo slug — per RF-032
- [ ] T139 [P] Create `README.md` with: FlowCar product overview, quick-start instructions (`docker compose up -d`, `prisma db seed`), feature list, architecture decisions, and justificativa das 2 features extras escolhidas (WhatsApp + operações em lote)
- [ ] T140 Create `src/lib/jobs/index.ts` BullMQ workers bootstrap — initializes `whatsapp-notifications` and `quote-expiration` workers; called once from `src/app/layout.tsx` server component via `import '@/lib/jobs'` with guard against re-initialization
- [ ] T141 [P] Create `src/components/shared/DataTable.tsx` reusable sortable/filterable table component with pagination, used by all list pages
- [ ] T142 [P] Create `src/lib/query-client.ts` TanStack React Query 5 client singleton and `src/app/(dashboard)/providers.tsx` QueryClientProvider wrapper for client-side data fetching and optimistic mutations
- [ ] T143 Validate all `quickstart.md` smoke flows end-to-end using seed data: login, create OS, view public queue, generate PDF, sign contract
- [ ] T144 Verify Docker Compose health checks pass (`docker compose ps` shows all services healthy), `/api/health` returns 200 in < 2 s, and 503 on simulated DB failure in < 5 s
- [ ] T145 Final security review: confirm tenant isolation in all list/get endpoints, no stack traces in API responses (SC-013), file access exclusively via pre-signed URLs, rate limiting active on `/api/auth/login`, `signedIp` never exposed in public responses

**Checkpoint**: `docker compose up -d && npx prisma db seed` completes in < 5 minutes; all quickstart flows pass; health check operational.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 — **BLOCKS all user stories**
- **US11 (Phase 3)**: Requires Phase 2
- **US1 (Phase 4)**: Requires Phase 2 (Phase 3 recommended first for seed users)
- **US2–US10 (Phases 5–13)**: All require Phase 2 completion; US3 depends on US2 (customers/vehicles); US6 depends on US3 (OS conversion); US10 depends on US3 (batch OS) and US8 (CSV export)
- **Polish (Phase 14)**: Requires all desired user stories complete

### User Story Dependencies

| Story | Depends on | Notes |
|-------|-----------|-------|
| US11 (P0) | Foundational | Multi-tenancy is the base — no user story makes sense without it |
| US1 (P1) | Foundational, US11 | Login requires users; registration creates first user |
| US2 (P2) | Foundational | Independent; integrates with US1 for auth |
| US3 (P3) | US2 | OS requires customer + vehicle records |
| US4 (P4) | US3 | Public queue reads QueueEntry data from OS |
| US5 (P5) | Foundational | Independent from US2/US3; product items in OS are additive |
| US6 (P6) | US2, US3 | Quotes need customers/vehicles; convert-to-OS needs US3 |
| US7 (P7) | US2 | Contracts need customer records |
| US8 (P8) | US3, US5, US6 | Dashboard KPIs aggregate OS + stock + quote data |
| US9 (P9) | Foundational | Settings are standalone; ServiceType unlocks OS/Quote items |
| US10 (P10) | US3, US8 | WhatsApp wraps US3 transitions; batch/CSV extends US3/US8 |

### Within Each User Story

- Services before Route Handlers
- Validations before services
- Route Handlers before UI pages
- Shared components before pages that use them

---

## Parallel Execution Examples

### Phase 2 — Foundational

```
Parallel track A: T010 (prisma.ts) + T011 (logger) + T012 (utils) + T013 (validations)
Parallel track B: T015 (auth/redis) after T014 (auth/jwt)
Parallel track C: T016 (s3) + T017 (upload)
Sequential: T018 (middleware) after A, B, C complete
```

### Phase 5 — US2 Customers & Vehicles

```
Parallel: T044 (customer validations) + T045 (vehicle validations)
Parallel: T046 (customer service) + T047 (vehicle service) — after validations
Parallel: T048–T051 (4 route handlers) — after services
Parallel: T052 (customers list page) + T053 (customer detail page) + T054 (CustomerForm) + T055 (VehicleForm)
```

### Phase 6 — US3 Service Orders

```
Parallel: T056 (validations) + T057 (queue service) + T058 (OS service)
Sequential: T059–T063 (route handlers) after services
Parallel: T064 (list page) + T065 (new OS page) + T066 (detail page) + T067–T069 (components)
```

---

## Implementation Strategy

### MVP First (US11 + US1 + US2 + US3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: US11 — tenant registration + multi-tenancy
4. Complete Phase 4: US1 — authentication + RBAC
5. Complete Phase 5: US2 — customers + vehicles
6. Complete Phase 6: US3 — service orders + queue
7. **STOP AND VALIDATE**: Full operational loop works (register → login → manage customer → create OS → queue visible)
8. Deploy/demo if ready

### Incremental Delivery After MVP

- Add US4 (public queue) → share demo URL with clients
- Add US5 (inventory) → stock control operational
- Add US9 (settings) → configure slug + service types
- Add US6 (quotes) → commercial flow complete
- Add US7 (contracts) → digital signature available
- Add US8 (dashboard/reports) → management insights
- Add US10 (extras) → WhatsApp + batch operations
- Phase 14: Polish + seed + README

### Parallel Team Strategy (3 developers)

After Foundational phase:
- **Dev A**: US11 → US1 → US4 (public-facing and auth)
- **Dev B**: US2 → US3 → US6 (core operational flow)
- **Dev C**: US5 → US9 → US8 (inventory, settings, reports)
- **Dev A+B+C**: US7 → US10 → Polish

---

## Notes

- `[P]` = different files, no dependencies on incomplete tasks in same phase — safe to run in parallel
- `[USN]` label maps each task to a specific user story for traceability and independent delivery
- Each user story phase ends with an independent test checkpoint
- No test tasks included (not requested in spec) — quickstart.md flows serve as manual acceptance tests
- Commit after completing each user story phase (at minimum)
- `signedIp` must NEVER appear in API responses or logs (SC-006, RF-024)
- All file accesses MUST go through pre-signed URLs — never direct MinIO URLs (RF-036)
- Every Route Handler MUST assert `tenantId` ownership before data access (RF-033)
