# Security Constitution — Plataforma Micro-SaaS para Lava-Jatos

**Versão**: 1.0.0 | **Ratificada**: 2026-05-08 | **Última Alteração**: 2026-05-08

---

## 1. Fronteiras de Confiança (Trust Boundaries)

### 1.1 Rotas Completamente Públicas (sem autenticação)

| Rota | Método | Risco | Proteção Obrigatória |
|---|---|---|---|
| `/fila/[slug]` | GET | Enumeração de slugs | Rate limiting |
| `/api/fila/publica/[slug]` | GET | Scraping de dados de fila | Rate limiting |
| `/api/contratos/[id]/assinar` | POST | Abuso de assinatura | Rate limiting + CSRF token |
| `/api/auth/[...nextauth]` | POST | Brute-force de senha | Rate limiting + lockout |
| `/register` | GET/POST | Criação abusiva de tenants | Rate limiting |

**Regra**: Qualquer dado retornado por rotas públicas DEVE ser mínimo — a fila pública retorna apenas posição, placa mascarada, status e tempo estimado. Nenhum dado de cliente (nome, e-mail, CPF) pode ser exposto.

### 1.2 Rotas Autenticadas (GERENTE + FUNCIONÁRIO)

Qualquer rota fora das listadas em 1.1 é tratada como privada. O middleware Next.js DEVE bloquear o acesso e redirecionar para `/login` quando não há sessão válida.

### 1.3 Rotas Exclusivas de GERENTE

As seguintes rotas DEVEM rejeitar requisições de FUNCIONÁRIO com HTTP 403, mesmo que o middleware de autenticação tenha passado:

- `GET|POST|PUT|DELETE /api/funcionarios/*`
- `GET|POST|PUT|DELETE /api/contratos/*`
- `GET /api/relatorios/*`
- `GET|PUT /api/configuracoes/*`

**Regra de implementação**: O helper `requireRole(session, 'MANAGER')` DEVE ser chamado no início de cada Route Handler restrito, antes de qualquer acesso ao banco de dados.

### 1.4 Isolamento Multi-Tenant (NON-NEGOTIABLE)

**Todo acesso ao banco de dados DEVE incluir o filtro `tenantId` derivado da sessão autenticada do usuário.** Nunca confiar em `tenantId` vindo do corpo da requisição ou da URL para operações que alterem dados. Qualquer tentativa de acessar um recurso de outro tenant — mesmo por um GERENTE — DEVE retornar HTTP 404 (nunca 403, para evitar enumeração de recursos).

---

## 2. Padrões de Autenticação e Autorização

### 2.1 Autenticação

- **Mecanismo**: NextAuth v5 com `CredentialsProvider` (e-mail + senha).
- **Sessão**: JWT stateless. O token DEVE conter apenas: `id`, `email`, `name`, `role`, `tenantId`.
- **Dados proibidos no JWT**: senha, hash de senha, tokens de API, dados pessoais além dos listados.
- **Hash de senha**: bcryptjs com mínimo de **12 rounds**. Nenhuma outra função de hash é aceitável.
- **Comparação de senha**: DEVE usar a função de comparação de tempo constante do bcryptjs. Nunca comparar hashes com `===`.
- **Mensagens de erro no login**: DEVE retornar sempre a mesma mensagem genérica independentemente se o e-mail ou a senha estão errados ("Credenciais inválidas"). Nunca indicar qual campo está incorreto.
- **Conta desativada**: Usuários com `isActive: false` DEVEM ser rejeitados na autenticação com a mesma mensagem genérica, sem revelar que a conta existe.

### 2.2 Autorização

- **Modelo**: RBAC de dois papéis — `MANAGER` (GERENTE) e `EMPLOYEE` (FUNCIONÁRIO).
- **Verificação dupla**: Middleware (autenticação) + helper `requireRole` dentro do Route Handler (autorização). Nunca depender apenas do middleware para controle de papel.
- **Assinatura de contrato público**: O endpoint `/api/contratos/[id]/assinar` DEVE verificar que o contrato pertence ao tenant correto (via slug ou token único do contrato) e que o status é `AGUARDANDO_ASSINATURA`. Contratos já assinados DEVEM retornar HTTP 409.

### 2.3 Rate Limiting

Os seguintes endpoints DEVEM ter rate limiting implementado:

| Endpoint | Limite Sugerido | Ação ao Exceder |
|---|---|---|
| `POST /api/auth/[...nextauth]` | 10 req/min por IP | HTTP 429 |
| `POST /api/contratos/[id]/assinar` | 5 req/min por IP | HTTP 429 |
| `POST /register` | 5 req/min por IP | HTTP 429 |
| `GET /api/fila/publica/[slug]` | 60 req/min por IP | HTTP 429 |

---

## 3. Isolamento de Dados e Privacidade (LGPD)

### 3.1 Dados Sensíveis Identificados

| Dado | Classificação | Localização |
|---|---|---|
| CPF / CNPJ | PII sensível (LGPD art. 5) | Tabela `customers` |
| Endereço completo | PII | Tabela `customers` |
| E-mail | PII | Tabelas `users`, `customers` |
| Hash de senha | Credencial | Tabela `users` |
| IP do signatário | PII / dado de autoria | Tabela `contracts` |
| Imagem de assinatura | PII biométrico | Tabela `contracts` + MinIO |
| Fotos de veículos/serviços | Potencial PII | MinIO |

### 3.2 Regras de Acesso a Dados

- **Toda query Prisma DEVE filtrar por `tenantId`** antes de retornar dados. O auditor DEVE rejeitar qualquer `findMany`, `findFirst` ou `findUnique` em modelos tenant-scoped que não inclua `where: { tenantId: session.tenantId }`.
- **A fila pública DEVE mascarar a placa**: exibir apenas o formato `ABC-**34` (primeiros 3 caracteres + hífen + 2 asteriscos + 2 últimos dígitos).
- **Logs NÃO DEVEM conter**: senhas, hashes, CPF, CNPJ, imagens de assinatura, IPs de usuários.
- **CPF/CNPJ na API**: Respostas de listagem de clientes DEVEM mascarar CPF/CNPJ (ex: `***.456.789-**`). O valor completo só é retornado no endpoint de detalhe do cliente.

### 3.3 Organização de Arquivos no MinIO

- Todos os arquivos DEVEM ser armazenados sob o prefixo `/{tenantId}/` no bucket.
- **Acesso a arquivos**: URLs pré-assinadas com expiração máxima de 1 hora para fotos/documentos privados. Apenas logos de tenants podem ter URLs públicas permanentes.
- O sistema DEVE validar que o `tenantId` do arquivo corresponde ao `tenantId` da sessão antes de gerar URLs pré-assinadas.

---

## 4. Política de Gerenciamento de Segredos

- **Mecanismo**: Variáveis de ambiente via arquivo `.env` (nunca commitado no Git).
- **Referência**: `.env.example` documenta todas as variáveis necessárias sem valores reais.
- **Variáveis obrigatórias de segurança**:
  - `NEXTAUTH_SECRET`: string aleatória de no mínimo 32 caracteres. DEVE ser única por ambiente.
  - `DATABASE_URL`: inclui credenciais do PostgreSQL. NUNCA usar as credenciais padrão em produção.
  - `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`: credenciais do MinIO. NUNCA usar `minioadmin` em produção.
  - `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`: chaves de acesso da aplicação ao MinIO.
- **Regra de auditoria**: O auditor DEVE rejeitar qualquer valor hardcoded de segredo no código-fonte. O padrão `process.env.NEXTAUTH_SECRET` é a única forma aceitável de referenciar segredos.
- **Rotação**: Quando `NEXTAUTH_SECRET` é rotacionado, todas as sessões JWT existentes são invalidadas automaticamente (comportamento intrínseco do NextAuth).

---

## 5. Padrões Seguros por Design (Secure-by-Design)

### 5.1 Consultas ao Banco de Dados

- **Toda interação com o banco DEVE usar o Prisma ORM** com queries parametrizadas. SQL raw é proibido exceto com `prisma.$queryRaw` usando tagged template literals (que parametriza automaticamente). Nunca interpolar variáveis diretamente em SQL raw.
- Movimentações de estoque são **append-only** — registros `StockMovement` nunca devem ser atualizados ou deletados.

### 5.2 Upload de Arquivos

- **Validação server-side obrigatória**: tipo MIME (allowlist: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`) e tamanho máximo de 10 MB.
- **Renomeação obrigatória**: o nome original do arquivo NUNCA deve ser usado. Um CUID deve ser gerado pelo servidor como nome do arquivo.
- **Não confiar no Content-Type do cliente**: o servidor DEVE verificar os magic bytes do arquivo para confirmar o tipo real antes de aceitar o upload.
- **Destino exclusivo MinIO**: nenhum arquivo deve ser escrito no sistema de arquivos local do servidor em nenhum ambiente.

### 5.3 Geração de PDFs

- PDFs de contratos e orçamentos são gerados server-side. Conteúdo inserido pelo usuário (ex: corpo do contrato) DEVE ser sanitizado antes da renderização para evitar injeção de conteúdo malicioso no PDF.

### 5.4 Números Sequenciais

- Números de ordens (`OS-XXXX`), orçamentos (`ORC-XXXX`) e contratos (`CTR-XXXX`) DEVEM ser gerados no banco de dados (por sequence ou query atômica por tenant). Nunca aceitar esses valores do cliente.

### 5.5 Headers HTTP de Segurança

Os seguintes headers DEVEM ser configurados no `next.config.ts`:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

O header `Content-Security-Policy` DEVE ser configurado permitindo apenas origens controladas (mesma origem para scripts e estilos, MinIO para imagens).

---

## 6. Segurança de APIs e Integrações

### 6.1 Respostas de API

- **Envelope padrão**: `{ success: true, data: T }` para sucesso; `{ success: false, error: { code, message } }` para erros.
- **Nunca expor stack traces** em respostas de produção. Detalhes de erro interno DEVEM ser logados no servidor, nunca retornados ao cliente.
- **Códigos de erro genéricos**: erros de autorização retornam HTTP 403 (ou 404 para recursos de outros tenants). Erros de autenticação retornam HTTP 401.

### 6.2 Assinatura de Contrato (Rota Pública)

- O endpoint DEVE aceitar apenas o `id` do contrato via parâmetro de rota, nunca dados do tenant via body.
- O IP do signatário DEVE ser capturado a partir do header `X-Forwarded-For` (quando atrás de proxy) ou do IP direto da conexão.
- A assinatura DEVE ser aceita apenas uma vez: verificar `status === 'AGUARDANDO_ASSINATURA'` de forma atômica antes de salvar.

---

## 7. Auditoria, Logs e Monitoramento

### 7.1 Eventos de Segurança que DEVEM ser Logados

| Evento | Nível | Dados a Registrar |
|---|---|---|
| Login bem-sucedido | INFO | `userId`, `tenantId`, timestamp |
| Tentativa de login falha | WARN | e-mail tentado (sem senha), IP, timestamp |
| Acesso negado (403/401) | WARN | rota, `userId` se autenticado, IP |
| Upload de arquivo | INFO | `tenantId`, tipo MIME, tamanho |
| Assinatura de contrato | INFO | `contractId`, `tenantId`, IP do signatário |
| Criação de tenant | INFO | `tenantId`, `slug`, timestamp |

### 7.2 Dados Proibidos em Logs

- Senhas (mesmo incorretas)
- Hashes de senha
- CPF/CNPJ completo
- Imagens de assinatura
- Conteúdo completo de contratos
- `NEXTAUTH_SECRET` ou qualquer chave de API

---

## 8. Mapeamento de Conformidade (LGPD)

| Artigo LGPD | Implementação na Plataforma |
|---|---|
| Art. 5 — Definição de dados pessoais | CPF, CNPJ, e-mail, endereço, IP, fotos identificados e mapeados na seção 3.1 |
| Art. 6 — Finalidade e necessidade | Dados coletados apenas para operação do lava-jato; sem coleta excessiva |
| Art. 46 — Medidas de segurança | Hash de senha (bcrypt 12r), isolamento multi-tenant, MinIO com acesso por URL pré-assinada |
| Art. 47 — Operadores de dados | Operadores (funcionários) acessam apenas dados do seu tenant |
| Art. 48 — Comunicação de incidentes | A política de resposta a incidentes é responsabilidade do operador da instância |
| Art. 18 — Direitos do titular | Não implementado automaticamente na v1 — operador deve atender por canal manual |

---

## Governança

- Esta Security Constitution complementa a `constitution.md` principal. Em caso de conflito de segurança, a Security Constitution prevalece.
- **Revisão obrigatória**: Esta constitution DEVE ser revisada antes de cada release major e sempre que uma nova rota pública for adicionada.
- **Auditoria**: Execute `/speckit.security-review.audit` para verificar a implementação contra estas regras.
- **Documento de referência**: `planejamento.md` e `specs/001-plataforma-lava-jato/spec.md` são as fontes de verdade do produto.

**Versão**: 1.0.0 | **Ratificada**: 2026-05-08 | **Última Alteração**: 2026-05-08
