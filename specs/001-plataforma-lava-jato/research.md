# Pesquisa Técnica

## 1. Nome do produto

- **Decisão**: usar **FlowCar** como nome do produto nesta v1.
- **Rationale**: o nome já está alinhado ao repositório, é curto, memorável e funciona bem em URL, branding, seed e documentação sem exigir renomeações adicionais.
- **Alternativas consideradas**: **LavaFlow** foi descartado por conflitar com o placeholder da constituição; **JetWash Cloud** foi descartado por soar genérico e pouco aderente ao contexto local.

## 2. Arquitetura da aplicação

- **Decisão**: implementar a solução como um único monólito Next.js 15 com App Router, SSR para dashboard e páginas públicas, e Route Handlers para APIs.
- **Rationale**: essa abordagem mantém a entrega simples, centraliza autenticação/autorização, reduz custo operacional e respeita o princípio monolith-first do projeto.
- **Alternativas consideradas**: frontend + backend separados foram rejeitados por elevar complexidade sem ganho proporcional; microserviços foram rejeitados por extrapolar a escala de um micro-SaaS nesta fase.

## 3. Autenticação e sessão

- **Decisão**: usar `jose` para emitir apenas o access token JWT; o refresh token será opaco, rotacionado, enviado por cookie HttpOnly e armazenado em Redis com revogação imediata.
- **Rationale**: isso satisfaz RF-001, simplifica invalidação de sessão, reduz exposição de dados no cookie e facilita logout/desativação de conta sem depender do tempo de expiração do access token.
- **Alternativas consideradas**: refresh token também em JWT foi rejeitado por dificultar revogação imediata; NextAuth v5 foi rejeitado porque conflita com a especificação refinada desta branch.

## 4. Multi-tenancy e isolamento

- **Decisão**: usar banco compartilhado com schema compartilhado e `tenantId` obrigatório em todas as tabelas de domínio; `slug` de tenant e `email` de usuário serão globais, enquanto placa de veículo e numeração operacional serão únicas por tenant.
- **Rationale**: o modelo shared-schema é o mais simples para a v1, mantém custos baixos, permite seeds realistas para múltiplos tenants e ainda entrega isolamento consistente quando toda query é escopada por sessão validada.
- **Alternativas consideradas**: banco por tenant foi rejeitado por elevar custo operacional; Row Level Security nativo do PostgreSQL foi adiado por adicionar atrito ao uso do Prisma nesta primeira versão.

## 5. Processamento assíncrono e jobs

- **Decisão**: usar BullMQ sobre Redis para duas filas internas: `whatsapp-notifications` e `quote-expiration`; os workers serão inicializados via bootstrap do runtime Node do próprio monólito.
- **Rationale**: o Redis já é dependência obrigatória do produto, BullMQ oferece retry/backoff e o bootstrap dentro do mesmo runtime evita introduzir um novo serviço lógico apenas para consumir filas.
- **Alternativas consideradas**: chamadas síncronas ao Twilio foram rejeitadas por aumentar latência nos fluxos de OS; cron externo foi rejeitado por exigir infraestrutura adicional; um worker separado foi rejeitado nesta fase por conflitar com a meta de manter o deploy o mais simples possível.

## 6. Armazenamento de arquivos

- **Decisão**: os uploads passarão pelo backend autenticado, serão validados no servidor e enviados diretamente ao MinIO via `@aws-sdk/client-s3`; downloads usarão apenas pre-signed URLs com validade curta.
- **Rationale**: o backend centraliza validação de tipo/tamanho, garante verificação de tenant antes do acesso, evita CORS/policies extras e atende RF-030, RF-036 e RF-037 sem camada de abstração desnecessária.
- **Alternativas consideradas**: armazenamento local foi rejeitado por violar a spec; `StorageProvider` foi rejeitado por aumentar indireção sem benefício nesta v1; upload direto do navegador com URL assinada foi adiado por complexidade adicional de UX e segurança.

## 7. Geração de PDF

- **Decisão**: adotar Playwright headless para renderização HTML-to-PDF de orçamentos e contratos.
- **Rationale**: Playwright oferece alta fidelidade visual com CSS moderno, permite reaproveitar templates HTML/React do próprio produto e ainda pode ser reutilizado nos testes E2E.
- **Alternativas consideradas**: Puppeteer foi descartado por não oferecer ganho relevante sobre Playwright neste contexto; `@react-pdf/renderer` foi descartado porque contraria explicitamente as clarificações do spec.

## 8. Observabilidade

- **Decisão**: usar `pino` como logger estruturado em JSON, com enriquecimento por `tenantId`, `userId`, módulo e correlation id por requisição, além de um `GET /api/health` verificando PostgreSQL e MinIO.
- **Rationale**: `pino` é leve, compatível com Node/Next.js e atende diretamente os requisitos de logs estruturados e troubleshooting da constituição.
- **Alternativas consideradas**: `console.log` foi rejeitado por falta de estrutura; APM externo foi tratado como opcional, não como dependência obrigatória da v1.

## 9. Estratégia de testes

- **Decisão**: usar Vitest para lógica de domínio e utilitários, React Testing Library para formulários/componentes e Playwright para fluxos ponta a ponta críticos.
- **Rationale**: essa combinação cobre domínio, UI e jornadas reais com uma pilha pequena, rápida e alinhada ao ecossistema Next.js.
- **Alternativas consideradas**: Jest foi descartado por setup mais pesado para esta base nova; Cypress foi descartado porque Playwright já atende E2E e também sustenta a decisão de PDF headless.

## 10. Features extras escolhidas

- **Decisão**: implementar exatamente 2 extras: notificações via WhatsApp e operações em lote com filtros avançados + exportação CSV.
- **Rationale**: ambas já foram ratificadas no spec, têm impacto direto em valor operacional e não desviam o produto do fluxo central de atendimento.
- **Alternativas consideradas**: dark mode, fidelidade e agenda online foram deixados fora para preservar foco e reduzir risco de escopo.
