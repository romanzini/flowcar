# FlowCar — Plataforma de Gestão de Lava-Jatos

**FlowCar** é um micro-SaaS multi-tenant para gestão de lava-jatos, construído com Next.js 15 App Router, PostgreSQL, Redis e MinIO.

## Funcionalidades

| # | Feature | Descrição |
|---|---------|-----------|
| US-11 | Onboarding de Tenant | Cadastro de novo lava-jato com RBAC automático (GERENTE) |
| US-1 | Autenticação | Login JWT + refresh token HttpOnly; RBAC GERENTE/FUNCIONARIO |
| US-2 | Clientes e Veículos | CRUD completo com busca por nome/telefone e unicidade de placa por tenant |
| US-3 | Ordens de Serviço | Ciclo completo de OS com fila interna, upload de fotos e histórico |
| US-4 | Fila Pública | URL pública `/fila/{slug}` com polling de 30 s, placas mascaradas e tempo estimado |
| US-5 | Controle de Estoque | Catálogo de produtos com movimentações imutáveis e alerta de estoque crítico |
| US-6 | Orçamentos e PDF | Orçamentos com geração de PDF via Playwright; conversão única para OS |
| US-7 | Contratos | Criação de contratos e assinatura digital em página pública via canvas pad |
| US-8 | Dashboard e Relatórios | KPIs em tempo real, relatórios filtráveis e exportação CSV |
| US-9 | Configurações | Perfil do lava-jato, slug e gerenciamento de tipos de serviço |
| US-10 (Extra 1) | Notificações WhatsApp | Notificações automáticas via Twilio + BullMQ nas transições de OS |
| US-10 (Extra 2) | Operações em Lote | Multi-select de ordens, ações em lote e filtros avançados |

### Por que WhatsApp e Operações em Lote?

- **WhatsApp** é o canal de comunicação dominante no Brasil, com cobertura de ~99% dos usuários de smartphone. Notificações automáticas reduzem o volume de ligações para o lava-jato e melhoram a experiência do cliente.
- **Operações em Lote** atendem à necessidade operacional de dias de alto movimento, quando o gerente precisa atualizar dezenas de ordens simultaneamente ou exportar relatórios para planilhas externas.

## Stack Técnica

- **Framework**: Next.js 15 (App Router, RSC, Route Handlers)
- **Linguagem**: TypeScript 5 (strict mode)
- **Banco de dados**: PostgreSQL 17 via Prisma 7 + `@prisma/adapter-pg`
- **Cache / Filas**: Redis 7 + BullMQ (refresh tokens, rate limiting, jobs assíncronos)
- **Armazenamento**: MinIO (S3-compatible) via `@aws-sdk/client-s3`
- **Autenticação**: JWT customizado com `jose`; refresh token HttpOnly cookie
- **PDF**: Playwright headless (HTML-to-PDF)
- **Notificações**: Twilio WhatsApp API
- **UI**: Tailwind CSS v4 + shadcn/ui + React Hook Form + TanStack React Query 5
- **Logging**: pino (JSON estruturado)
- **Testes**: Vitest + React Testing Library + Playwright E2E

## Quick Start

### Pré-requisitos

- Docker e Docker Compose
- Node.js 22 LTS
- npm 10+

### Fazendo o build da imagem

```bash
docker compose up --build
```

### Subida local

```bash
# 1. Configure as variáveis de ambiente
cp .env.example .env

# 2. Suba a infraestrutura (PostgreSQL, Redis, MinIO)
docker compose up -d postgres redis minio

# 3. Instale as dependências
npm install

# 4. Instale os browsers do Playwright
npx playwright install --with-deps

# 5. Aplique as migrations do banco
npx prisma migrate dev

# 6. Carregue os dados de demonstração (2 tenants)
npm run db:seed

# 7. Inicie a aplicação
npm run dev
```

### Verificar saúde

```bash
curl http://localhost:3000/api/health
# → { "success": true, "data": { "status": "healthy", ... } }
```

### Credenciais de Demo

Após o seed, dois tenants estarão disponíveis:

**AutoSpa Premium** (`/fila/autospa`)
| Perfil | E-mail | Senha |
|--------|--------|-------|
| GERENTE | carlos@autospa.com | Autospa@123 |
| FUNCIONARIO | ana@autospa.com | Func@1234 |
| FUNCIONARIO | bruno@autospa.com | Func@1234 |

**LavaRápido Express** (`/fila/lavarapido`)
| Perfil | E-mail | Senha |
|--------|--------|-------|
| GERENTE | fernanda@lavarapido.com | Lava@1234 |
| FUNCIONARIO | lucas@lavarapido.com | Func@1234 |
| FUNCIONARIO | mariana@lavarapido.com | Func@1234 |

## Fluxo de Validação Manual

1. **Login**: acesse `http://localhost:3000/login` com as credenciais acima
2. **Dashboard**: verifique os KPIs (OS abertas, receita do dia, estoque crítico)
3. **Fila Pública**: `http://localhost:3000/fila/autospa` — sem autenticação
4. **Nova OS**: crie uma ordem de serviço para um cliente existente
5. **Orçamento + PDF**: crie um orçamento e clique em "Gerar PDF"
6. **Assinatura Digital**: crie um contrato, gere o link de assinatura e assine em aba anônima

## Arquitetura

```
src/
├── app/
│   ├── (auth)/          # Login e cadastro (SSR)
│   ├── (dashboard)/     # Painel autenticado (GERENTE + FUNCIONARIO)
│   ├── fila/[slug]/     # Fila pública (anônimo)
│   ├── contratos/assinar/[token]/  # Assinatura pública (anônimo)
│   └── api/             # Route Handlers (REST)
├── components/          # UI components (shadcn/ui + customizados)
├── lib/                 # Integrações técnicas (auth, jobs, pdf, storage)
├── server/              # Serviços e queries de domínio
└── types/               # Tipos compartilhados
prisma/                  # Schema, migrations e seed
```

## Decisões de Arquitetura

| Decisão | Justificativa |
|---------|---------------|
| JWT customizado (vs NextAuth) | Access token 15 min + refresh token 7 dias com revogação imediata em Redis; NextAuth não suporta esse modelo nativo |
| Playwright para PDF (vs @react-pdf/renderer) | Fidelidade visual total usando templates HTML/CSS existentes |
| MinIO direto (vs StorageProvider) | Sem abstração desnecessária nesta v1; acesso direto via `@aws-sdk/client-s3` |
| Polling 30 s (vs WebSocket/SSE) | Simplicidade e compatibilidade com qualquer CDN/proxy; requisito explícito do spec |

## Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento (Next.js dev server)
npm run build        # Build de produção
npm run start        # Iniciar servidor de produção
npm run lint         # Linting com ESLint
npm run typecheck    # Type-checking sem emissão (tsc --noEmit)
npm run test         # Testes unitários (Vitest)
npm run test:e2e     # Testes E2E (Playwright)
npm run db:seed      # Popular banco com dados de demonstração
```
