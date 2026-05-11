# Plano de Implementação: Plataforma Micro-SaaS para Gestão de Lava-Jatos

**Branch**: `001-plataforma-lava-jato` | **Data**: 2026-05-08 | **Spec**: `/specs/001-plataforma-lava-jato/spec.md`
**Entrada**: Especificação da feature em `/specs/001-plataforma-lava-jato/spec.md`

## Resumo

Construir o FlowCar como um micro-SaaS multi-tenant em um monólito Next.js 15 App Router, com PostgreSQL + Prisma para dados transacionais, Redis para refresh tokens, rate limiting e filas assíncronas, MinIO privado para arquivos, geração de PDF via Playwright headless, polling a cada 30 segundos para a fila pública e integração assíncrona com Twilio WhatsApp via BullMQ. O escopo cobre onboarding de tenant, RBAC gerente/funcionário, clientes/veículos, ordens/fila, estoque, orçamentos, contratos com assinatura pública, dashboard/relatórios, observabilidade e exatamente 2 features extras: notificações por WhatsApp e operações em lote com filtros avançados.

## Contexto Técnico

**Linguagem/Versão**: TypeScript 5 em modo strict  
**Dependências Principais**: Next.js 15 (App Router), React 19, Prisma 7, PostgreSQL 17, Zod 4, Tailwind CSS 4, shadcn/ui, React Hook Form, TanStack React Query 5, `jose`, `bcryptjs`, `ioredis`, `bullmq`, `twilio`, `@aws-sdk/client-s3`, Playwright, `isomorphic-dompurify` (sanitização HTML antes de geração de PDFs — SEC-002) e `pino`  
**Armazenamento**: PostgreSQL 17 para dados relacionais; Redis para refresh tokens, rate limiting e jobs; MinIO privado via S3-compatible para arquivos  
**Testes**: Vitest + React Testing Library para unitários/componentes; Playwright para E2E e smoke flows; validação de seed com Prisma  
**Plataforma Alvo**: Servidor Linux containerizado com Docker Compose; navegadores modernos desktop e mobile  
**Tipo de Projeto**: Aplicação web full-stack monolítica multi-tenant  
**Metas de Performance**: `docker compose up -d` operacional em menos de 5 minutos; geração de PDF em menos de 5 segundos para até 20 itens; P95 abaixo de 2 segundos em dashboard/lista de OS com 5 usuários simultâneos; fila pública atualizada em até 30 segundos; `/api/health` saudável em menos de 2 segundos e degradado em menos de 5 segundos  
**Restrições**: código em inglês e UI/docs em PT-BR; access token de 15 minutos + refresh token de 7 dias com revogação imediata em Redis; bucket MinIO privado com pre-signed URL de até 1 hora; upload apenas JPG/PNG/WEBP/PDF até 10 MB; polling em vez de WebSocket/SSE; exatamente 2 features extras; envelope padrão `{ success, data/error }`; logs JSON estruturados; sem armazenamento local; sem `StorageProvider`  
**Escala/Escopo**: 1 monólito cobrindo 11 user stories, 2 tenants seeded, 1 gerente + 2 funcionários por tenant, 20 OS por tenant no seed, meta inicial de 5 usuários simultâneos e operação diária de pequenos e médios lava-jatos

## Verificação da Constituição

**Gate pré-pesquisa**: APROVADO COM RESSALVAS  
**Gate pós-design**: APROVADO COM RESSALVAS

- **Princípio I - Monolith-First**: PASSA. O plano mantém um único monólito Next.js 15 App Router.
- **Princípio II - Type Safety End-to-End**: PASSA. TypeScript strict, Prisma, Zod e envelope padrão foram mantidos.
- **Princípio III - Código em inglês; UI e documentação em PT-BR**: PASSA. Todos os artefatos desta feature permanecem em português e o código planejado seguirá em inglês.
- **Princípio IV - Segurança e RBAC**: PASSA COM DESVIO DOCUMENTADO. O spec refinado substitui NextAuth por JWT customizado com Redis; o restante do princípio continua aplicável: bcrypt, RBAC em handlers, middleware e validações server-side.
- **Princípio V - Integridade por migração e validação**: PASSA. Prisma migrations, constraints compostas por tenant e validação Zod estão previstas.
- **Princípio VI - Simplicidade & YAGNI**: PASSA. Polling de 30 segundos, monólito único, integração direta com MinIO e exatamente 2 features extras.
- **Princípio VII - Deploy com Docker**: PASSA. O plano exige `docker compose`, `.env.example`, health check e stack autocontida com PostgreSQL, Redis, MinIO e app.
- **Princípio VIII - Observabilidade**: PASSA. Logs JSON, `/api/health`, handler global de erro e healthcheck do Compose estão no escopo.

**Ressalvas obrigatórias antes da implementação**:

- A seção `Tech Stack Constraints` da constituição ficou desatualizada em relação ao spec validado nesta branch.
- Os desvios aprovados pelo spec e refletidos neste plano são:
  1. `NextAuth v5` -> autenticação JWT customizada com `jose` + refresh tokens em Redis.
  2. `@react-pdf/renderer` -> renderização HTML-to-PDF via Playwright headless.
  3. `StorageProvider` -> acesso direto ao MinIO via `@aws-sdk/client-s3`.
  4. `2-3 features extras` -> exatamente 2 features extras obrigatórias.
- A implementação deve começar somente após a constituição ser emendada para refletir essas quatro decisões, evitando conflito entre guardrails e spec.

## Estrutura do Projeto

### Documentação desta feature

```text
specs/001-plataforma-lava-jato/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.yaml
└── tasks.md
```

### Estrutura de código planejada

```text
.
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── cadastro/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx
│   │   │   ├── clientes/
│   │   │   ├── ordens-servico/
│   │   │   ├── inventario/
│   │   │   ├── orcamentos/
│   │   │   ├── contratos/
│   │   │   ├── funcionarios/
│   │   │   ├── relatorios/
│   │   │   └── configuracoes/
│   │   ├── fila/[slug]/page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       ├── health/
│   │       ├── tenants/
│   │       ├── fila-publica/
│   │       ├── clientes/
│   │       ├── veiculos/
│   │       ├── ordens-servico/
│   │       ├── inventario/
│   │       ├── orcamentos/
│   │       ├── contratos/
│   │       ├── uploads/
│   │       ├── relatorios/
│   │       └── configuracoes/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── forms/
│   │   ├── queue/
│   │   ├── reports/
│   │   ├── shared/
│   │   └── ui/
│   ├── lib/
│   │   ├── auth/
│   │   ├── jobs/
│   │   ├── logging/
│   │   ├── pdf/
│   │   ├── storage/
│   │   ├── validations/
│   │   ├── prisma.ts
│   │   └── utils.ts
│   ├── server/
│   │   ├── policies/
│   │   ├── queries/
│   │   └── services/
│   ├── types/
│   └── middleware.ts
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

**Decisão estrutural**: usar um único projeto Next.js full-stack. O App Router concentra páginas e Route Handlers; `src/server/` abriga serviços e consultas de domínio; `src/lib/` concentra integrações técnicas (auth, jobs, logging, PDF, storage, validações); `prisma/` concentra schema, migrations e seed. Não haverá backend separado, microserviços nem camada genérica de repositórios.

## Rastreamento de Complexidade

| Violação | Por que é necessária | Alternativa mais simples rejeitada porque |
| --------- | -------------------- | ----------------------------------------- |
| `NextAuth v5` travado na constituição | RF-001 exige access token curto + refresh token server-side com revogação imediata e rate limiting apoiado em Redis | Adaptar NextAuth aumentaria complexidade, fugiria do fluxo exigido e não entregaria o modelo de sessão definido na spec |
| `@react-pdf/renderer` travado na constituição | RF-021 e RF-025 exigem HTML-to-PDF por browser headless para fidelidade visual | `@react-pdf/renderer` contradiz a decisão já validada na spec e dificulta reaproveitar templates HTML |
| `StorageProvider` permitido pela constituição | RF-037 proíbe abstração e exige cliente S3 direto contra MinIO em todos os ambientes | Uma abstração extra não agrega valor nesta v1 e aumenta superfície de manutenção |
| `2-3 features extras` na constituição | User Story 10 fixa exatamente 2 features extras | Implementar uma terceira feature dilui o escopo, adiciona risco e foge do aceite da feature |
