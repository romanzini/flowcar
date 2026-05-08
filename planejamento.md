# Micro-SaaS para Lava-Jatos

## Contexto

Aplicacao micro-SaaS para gestao de lava-jatos. O objetivo e criar uma plataforma completa que cubra as operacoes diarias de um lava-jato: controle de estoque, orcamentos, contratos, ordens de servico, fila de atendimento publica e relatorios. O projeto deve ser simples, porem abrangente, e estar pronto para producao.

---

## Nome do Projeto

O implementador deve escolher um nome criativo e memoravel para o projeto. O nome sera usado em:
- `package.json` (name)
- Titulo da aplicacao (header, login page, browser tab)
- Seed data (nome do lava-jato de demonstracao)
- Emails de seed (ex: admin@nomedoprojeto.com)
- Slug padrao da fila publica

Criterios: deve remeter ao universo de lava-jatos, ser curto, facil de lembrar e funcionar bem como nome de produto SaaS.

---

## Features Extras (escolha do implementador)

Alem das funcionalidades core, o implementador deve escolher e implementar **2-3 features extras** que agreguem valor ao produto. Sugestoes (nao limitadas a estas):

- **Dark mode**: Toggle de tema claro/escuro usando next-themes + shadcn/ui
- **Notificacoes por email**: Enviar emails ao cliente quando servico concluir, orcamento pronto, etc. (Nodemailer + React Email)
- **Historico de precos**: Rastrear mudancas de preco dos servicos ao longo do tempo
- **Programa de fidelidade**: Pontos acumulados por servico, com recompensas
- **Agenda/Agendamento**: Permitir que clientes agendem horarios online
- **Painel de performance**: Metricas de produtividade por funcionario (tempo medio, servicos/dia)
- **Exportacao de dados**: Exportar relatorios para CSV/Excel
- **WhatsApp integration**: Link direto para enviar mensagens ao cliente via WhatsApp
- **QR Code na fila**: Gerar QR code para o cliente acessar o link da fila facilmente

O implementador deve justificar brevemente a escolha no README.

---

## Tech Stack

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack em um projeto, SSR, API Routes, versao estavel |
| Linguagem | TypeScript 5 | Type safety ponta a ponta |
| Banco | PostgreSQL 17 | Robusto para dados de negocio |
| ORM | Prisma 7 | Migrations, seeding, tipos gerados |
| Auth | NextAuth v5 (Auth.js) | Integrado ao Next.js, JWT, roles |
| Validacao | Zod 4 | Schemas compartilhados frontend/backend |
| UI | Tailwind CSS 4 + shadcn/ui | Desenvolvimento rapido, componentes acessiveis |
| Data Fetching | TanStack React Query 5 | Cache, optimistic updates |
| Forms | React Hook Form + Zod | Forms performaticos com validacao |
| Upload | Local (dev) / S3-compatible via MinIO (prod) | Abstraction layer |
| PDF | @react-pdf/renderer | Contratos e orcamentos |
| Graficos | Recharts | Relatorios |
| Container | Docker + Docker Compose | Deploy simplificado |

**Decisoes chave**:
- Monolito Next.js (nao microservicos). Adequado para a escala de um micro-SaaS.
- Codigo fonte em ingles (variaveis, funcoes, comentarios). UI em portugues brasileiro.
- Features extras serao escolhidas pelo implementador (ver secao acima).

---

## Estrutura do Projeto

```
projeto/
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── DEPLOY.md
├── next.config.ts
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   └── uploads/            # Dev file storage
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout (providers)
│   │   ├── page.tsx        # Redirect to dashboard
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx  # Sidebar + header
│   │   │   ├── page.tsx    # Dashboard home (KPIs)
│   │   │   ├── inventario/
│   │   │   ├── orcamentos/
│   │   │   ├── contratos/
│   │   │   ├── servicos/
│   │   │   ├── fila/
│   │   │   ├── clientes/
│   │   │   ├── funcionarios/
│   │   │   ├── relatorios/
│   │   │   └── configuracoes/
│   │   ├── fila/[slug]/    # Pagina PUBLICA de fila
│   │   │   └── page.tsx
│   │   └── api/            # Route Handlers
│   │       ├── auth/[...nextauth]/
│   │       ├── inventario/
│   │       ├── orcamentos/
│   │       ├── contratos/
│   │       ├── servicos/
│   │       ├── fila/
│   │       ├── clientes/
│   │       ├── funcionarios/
│   │       ├── relatorios/
│   │       ├── upload/
│   │       └── configuracoes/
│   ├── components/
│   │   ├── ui/             # shadcn/ui
│   │   ├── layout/         # sidebar, header, mobile-nav
│   │   ├── forms/          # formularios por entidade
│   │   ├── tables/         # DataTable reutilizavel
│   │   ├── charts/         # graficos de relatorios
│   │   ├── queue/          # board de fila
│   │   └── shared/         # file-upload, signature-pad, status-badge
│   ├── lib/
│   │   ├── prisma.ts       # Singleton
│   │   ├── auth.ts         # NextAuth config
│   │   ├── storage.ts      # Abstracao local/S3
│   │   ├── pdf.ts          # Geracao de PDF
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── validations/    # Zod schemas por entidade
│   ├── hooks/              # React Query hooks por entidade
│   ├── types/
│   └── middleware.ts       # Protecao de rotas
└── scripts/
    └── seed.ts
```

---

## Schema do Banco (Prisma)

### Modelos principais

- **User**: id, name, email, passwordHash, role (MANAGER/EMPLOYEE), phone, isActive
- **Customer**: id, name, email, phone, cpfCnpj, address
- **Vehicle**: id, customerId, plate, brand, model, year, color
- **VehiclePhoto**: id, vehicleId, url, caption
- **Product**: id, name, unit, currentStock, minimumStock, costPrice, isActive
- **StockMovement**: id, productId, userId, type (IN/OUT/ADJUSTMENT), quantity, unitCost
- **ServiceType**: id, name, basePrice, estimatedMinutes, isActive
- **Quote**: id, customerId, quoteNumber (ORC-0001), status (DRAFT/SENT/APPROVED/REJECTED/EXPIRED), totalAmount
- **QuoteItem**: id, quoteId, serviceTypeId, quantity, unitPrice, discount, subtotal
- **Contract**: id, customerId, contractNumber (CTR-0001), status (DRAFT/PENDING_SIGNATURE/SIGNED/CANCELLED), title, content, signatureData, signatureIp, pdfUrl
- **ServiceOrder**: id, customerId, vehicleId, employeeId, orderNumber (OS-0001), status (WAITING/IN_PROGRESS/COMPLETED/CANCELLED), totalAmount, startedAt, completedAt
- **ServiceOrderItem**: id, serviceOrderId, serviceTypeId, productId, description, quantity, unitPrice, subtotal
- **ServicePhoto**: id, serviceOrderId, url, caption
- **QueueEntry**: id, serviceOrderId (unique), position, estimatedStart, estimatedEnd
- **CarWashConfig**: id, businessName, slug (para URL publica), simultaneousSlots, phone, address, logoUrl
- **FileUpload**: id, filename, originalName, mimeType, size, url

### Indexes importantes
- users: email, role
- customers: phone, cpfCnpj
- vehicles: plate (unique), customerId
- service_orders: status, createdAt, employeeId, vehicleId
- queue_entries: position

---

## API Design

Formato padrao de resposta:
```
Sucesso: { success: true, data: T, meta?: { page, limit, total, totalPages } }
Erro:    { success: false, error: { code, message, details? } }
```

### Rotas publicas (sem auth)
- `POST /api/auth/[...nextauth]` - Login/logout
- `GET /api/fila/publica/[slug]` - Fila publica
- `POST /api/contratos/[id]/assinar` - Assinatura de contrato
- `GET /fila/[slug]` - Pagina publica de fila

### Rotas autenticadas (Employee + Manager)
- `/api/inventario` - CRUD produtos + movimentacoes de estoque
- `/api/orcamentos` - CRUD orcamentos + itens + PDF
- `/api/servicos` - CRUD ordens de servico + mudanca de status + fotos
- `/api/fila` - Gerenciamento da fila
- `/api/clientes` - CRUD clientes + veiculos
- `/api/upload` - Upload de arquivos

### Rotas somente Manager
- `/api/funcionarios` - CRUD funcionarios
- `/api/contratos` - CRUD contratos
- `/api/relatorios/*` - Faturamento, inventario, servicos, clientes
- `/api/configuracoes` - Configuracoes do lava-jato

---

## Sistema de Fila Publica

1. Manager configura um `slug` nas configuracoes (ex: "lava-jato-centro")
2. URL publica: `dominio.com/fila/lava-jato-centro`
3. Ao criar um ServiceOrder com status WAITING, um QueueEntry e criado
4. Calculo de tempo estimado: soma dos estimatedMinutes dos carros a frente / simultaneousSlots
5. Endpoint publico retorna apenas: posicao, placa parcialmente mascarada (ABC-**34), status, tempo estimado
6. Auto-refresh a cada 30 segundos via polling (simples e adequado para a escala)

---

## Auth e Autorizacao

- NextAuth v5 com CredentialsProvider (email + senha)
- Sessao via JWT (stateless)
- bcryptjs para hash de senha (12 rounds)
- Middleware protege rotas automaticamente
- Helper `requireRole(session, 'MANAGER')` nos Route Handlers
- Sidebar condicional baseada em `session.user.role`

---

## Upload de Arquivos

- Abstraction layer em `src/lib/storage.ts` com interface StorageProvider
- Dev: filesystem local (`/public/uploads/`)
- Prod: MinIO (S3-compatible) via Docker
- Validacao: tipos permitidos (jpg, png, webp, pdf), max 10MB
- Nomes unicos com CUID

---

## Seed Data

- 1 Manager: admin@<nome-do-projeto>.com / password123
- 2 Employees: joao@<nome-do-projeto>.com, maria@<nome-do-projeto>.com
- 10 Produtos com estoque realista (shampoo, cera, silicone, etc.)
- 8 Tipos de servico (Lavagem Simples, Completa, Premium, Polimento, etc.)
- 15 Clientes com nomes e CPFs brasileiros
- 20 Veiculos (Fiat, VW, Chevrolet, Honda, Toyota)
- 5 Orcamentos (status variados)
- 3 Contratos (assinado, pendente, rascunho)
- 20 Ordens de servico nos ultimos 30 dias
- Movimentacoes de estoque iniciais
- 1 CarWashConfig com slug de demonstracao

---

## Plano de Implementacao (Subagentes)

### Fase 0: Bootstrap (sequencial, 1 agente)
1. `npx create-next-app` com TypeScript, Tailwind, App Router
2. Instalar todas as dependencias
3. Configurar Prisma com schema completo
4. Docker Compose (Postgres + MinIO)
5. `.env.example`
6. Criar estrutura de diretorios
7. `src/lib/prisma.ts`, `src/lib/utils.ts`
8. Inicializar shadcn/ui
9. Rodar migration inicial
10. Criar layouts base (root, dashboard skeleton, auth)
11. Criar componente DataTable reutilizavel (dependencia compartilhada)

### Fase 1: 6 agentes em paralelo

**Agente 1: Auth + Sistema de Usuarios**
- NextAuth config, login page, middleware
- CRUD funcionarios (API + paginas)
- Zod schemas de usuario

**Agente 2: Inventario**
- CRUD produtos (API + paginas)
- Movimentacoes de estoque
- Alertas de estoque baixo
- Hooks React Query

**Agente 3: Clientes + Veiculos + Ordens de Servico**
- CRUD clientes e veiculos (API + paginas)
- CRUD ordens de servico (API + paginas)
- Transicoes de status
- Upload de fotos do servico

**Agente 4: Orcamentos + Contratos + PDF**
- CRUD orcamentos (API + paginas + geracao PDF)
- CRUD contratos (API + paginas)
- Componente SignaturePad
- Fluxo de assinatura publica

**Agente 5: Fila + Relatorios + Dashboard**
- API de fila + pagina de gerenciamento
- Pagina publica de fila
- APIs de relatorios + pagina com graficos
- Dashboard home com KPIs
- API e pagina de configuracoes

**Agente 6: Upload + Seed + Deploy**
- Storage abstraction layer
- API de upload + componente FileUpload
- Script de seed completo
- Dockerfile multi-stage
- docker-compose.yml
- DEPLOY.md com instrucoes passo a passo

### Fase 2: Integracao (sequencial, 1 agente)
1. Conectar navegacao (sidebar, breadcrumbs)
2. Testar fluxos end-to-end
3. Corrigir problemas de integracao entre agentes
4. Loading states, error boundaries, empty states
5. Responsividade mobile
6. Toast notifications, dialogs de confirmacao
7. Verificar seed data

---

## Deploy (Producao)

Docker Compose com 3 servicos: app, postgres, minio.

Passos:
1. Clonar repositorio
2. Copiar `.env.example` para `.env`, preencher secrets
3. `docker compose up -d`
4. `docker compose exec app npx prisma migrate deploy`
5. `docker compose exec app npx prisma db seed` (opcional)
6. Configurar reverse proxy (nginx/Caddy) com SSL
7. Apontar dominio para o servidor

---

## Verificacao

1. `docker compose up -d` sobe todos os servicos
2. `npx prisma db seed` carrega dados de teste
3. Acessar `http://localhost:3000/login` e logar como admin (credenciais do seed)
4. Navegar por todas as paginas do dashboard
5. Criar um orcamento, gerar PDF
6. Criar uma ordem de servico, mover na fila
7. Acessar a pagina publica de fila usando o slug do seed
8. Verificar relatorios com dados do seed
9. Testar upload de imagem em veiculo/servico
10. Testar fluxo de assinatura de contrato