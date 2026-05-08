# Quickstart

## Objetivo

Este guia descreve o fluxo alvo para subir o FlowCar localmente após a implementação da feature, com PostgreSQL, Redis, MinIO e aplicação Next.js rodando por Docker Compose.

## Pré-requisitos

- Docker e Docker Compose instalados.
- Node.js 22 LTS.
- npm 10 ou compatível.
- Dependências de navegador do Playwright disponíveis localmente.

## Variáveis mínimas esperadas

- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

## Subida local

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

1. Suba as dependências de infraestrutura:

```bash
docker compose up -d postgres redis minio
```

1. Instale as dependências do projeto:

```bash
npm install
```

1. Instale os browsers do Playwright:

```bash
npx playwright install --with-deps
```

1. Aplique as migrations locais:

```bash
npx prisma migrate dev
```

1. Carregue dados de demonstração para 2 tenants:

```bash
npm run db:seed
```

1. Inicie a aplicação em modo desenvolvimento:

```bash
npm run dev
```

1. Verifique o health check:

```bash
curl http://localhost:3000/api/health
```

## Fluxo mínimo de validação manual

1. Acesse `http://localhost:3000/cadastro` e cadastre um novo lava-jato.
2. Faça login em `http://localhost:3000/login` com o gerente criado.
3. Configure o slug da fila pública, vagas simultâneas e logotipo.
4. Cadastre ao menos um tipo de serviço e um funcionário.
5. Cadastre um cliente com `whatsappPhone` e associe um veículo.
6. Crie uma ordem de serviço em `AGUARDANDO` e confirme a entrada na fila interna.
7. Abra `http://localhost:3000/fila/<slug>` em aba anônima e verifique placa mascarada, status e tempo estimado.
8. Conclua a OS e confirme a remoção da fila e o enfileiramento da notificação WhatsApp.
9. Gere um orçamento em PDF, aprove e converta em OS.
10. Gere um contrato, abra o link público de assinatura, assine e baixe o PDF final.

## Checks automatizados esperados

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## Serviços esperados no `docker compose`

- `app`: Next.js 15 em modo Node com Route Handlers e bootstrap de jobs.
- `postgres`: persistência transacional via Prisma.
- `redis`: refresh tokens, rate limiting e filas BullMQ.
- `minio`: armazenamento privado de fotos, PDFs e logotipo.

## Observabilidade mínima

- `GET /api/health` deve retornar HTTP 200 quando PostgreSQL e MinIO estiverem saudáveis.
- Logs devem sair em JSON estruturado com `timestamp`, `level`, `service`, `tenantId`, `userId` e `message`.
- Nenhuma resposta de erro em produção deve expor stack trace.
