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

