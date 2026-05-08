# Release Gate Checklist: Plataforma Micro-SaaS para Gestão de Lava-Jatos

**Objetivo**: Gate de aprovação formal (Tech Lead) — validar completude, clareza, consistência e mensurabilidade dos requisitos antes do início da implementação
**Criado em**: 2026-05-08
**Audiência**: Tech Lead
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [contracts/api.yaml](../contracts/api.yaml)
**Domínios cobertos**: Segurança & Autenticação, Contratos da API, Plano Técnico, Fluxos de Estado & Edge Cases, Todos os módulos, Observabilidade

---

## Segurança & Autenticação

- [ ] CHK001 — São os requisitos de expiração dos tokens (access: 15 min, refresh: 7 dias) especificados de forma consistente entre spec e plan? [Consistency, Spec §RF-001, plan.md §Contexto Técnico]
- [ ] CHK002 — São os requisitos de revogação do refresh token cobertos para **ambos** os caminhos: logout voluntário e desativação de conta (`isActive: false`)? [Completeness, Spec §RF-001]
- [ ] CHK003 — Os atributos de segurança do cookie HttpOnly (Secure, SameSite) que transporta o refresh token estão especificados? [Gap] — spec menciona "cookie HttpOnly" mas não define os demais atributos
- [ ] CHK004 — As claims do payload do access token (userId, tenantId, role, exp) estão especificadas nos requisitos? [Gap] — ausência de spec do payload dificulta validação de RBAC server-side
- [ ] CHK005 — O requisito de mensagem genérica "Credenciais inválidas." é aplicado de forma consistente a **todos** os caminhos de falha de autenticação (senha incorreta, conta inexistente, conta desativada)? [Consistency, Spec §RF-004a]
- [ ] CHK006 — O ponto de aplicação do controle de acesso RBAC (middleware vs. handler de API) está especificado nos requisitos? [Gap] — spec define *o que* controlar, não *onde* garantir
- [ ] CHK007 — O requisito de `bcrypt` com mínimo de 12 rounds é consistente entre spec (RF-004) e plan? [Consistency, Spec §RF-004, plan.md §Contexto Técnico]
- [ ] CHK008 — O requisito de sliding window de 15 min para rate limiting está suficientemente especificado para ser implementado sem ambiguidade (estrutura de dados, chave de lookup, comportamento após reset)? [Clarity, Spec §RF-004b]
- [ ] CHK009 — São os cabeçalhos de resposta para requisições bloqueadas por rate limiting (ex: `Retry-After`) especificados? [Gap] — spec define HTTP 429 mas não define cabeçalhos de resposta
- [ ] CHK010 — São os requisitos de geração e validação de pre-signed URLs (verificação de propriedade do tenant antes de gerar) suficientemente especificados para serem testáveis? [Measurability, Spec §RF-036]

---

## Isolamento de Tenants

- [ ] CHK011 — O escopo de tenant é exigido de forma explícita para **todas** as entidades listadas na spec (Tenant, Usuário, Cliente, Veículo, Produto, Ordem, Orçamento, Contrato, etc.)? [Coverage, Spec §RF-033, §Entidades Principais]
- [ ] CHK012 — O formato do path de armazenamento `{tenantId}/{tipo}/{uuid}.{ext}` é consistente entre spec (RF-036) e plan? [Consistency, Spec §RF-036, plan.md §Contexto Técnico]
- [ ] CHK013 — Os critérios de aceitação de US-11 cobrem explicitamente o cenário de acesso cross-tenant via URL direta (ex: GET `/api/clientes?tenantId=outro-tenant`)? [Coverage, Spec US11 §Cenário 4]
- [ ] CHK014 — A unicidade de placa **por tenant** (permitindo a mesma placa em tenants distintos) está definida de forma consistente entre spec (RF-006), critérios de aceitação (US2) e modelo de dados? [Consistency, Spec §RF-006]
- [ ] CHK015 — Os requisitos de isolamento do bucket MinIO (bucket privado, sem acesso público, pre-signed URL obrigatória) são suficientemente mensuráveis para validação em teste? [Measurability, Spec §RF-036]

---

## Contratos da API

- [ ] CHK016 — O esquema de resposta de erro (`ErrorEnvelope`) está definido de forma consistente para todos os endpoints documentados no `api.yaml`? [Consistency, contracts/api.yaml]
- [ ] CHK017 — Os endpoints de todos os 11 user stories estão cobertos no `api.yaml`, ou apenas os fluxos críticos? Se apenas críticos, essa limitação de escopo está explicitamente documentada? [Completeness, contracts/api.yaml §info.description]
- [ ] CHK018 — Respostas de paginação para endpoints de listagem (clientes, ordens, produtos, etc.) estão definidas no contrato da API? [Gap] — spec menciona filtros mas não define estrutura de paginação
- [ ] CHK019 — A distinção entre HTTP 401 (não autenticado) e 403 (não autorizado/RBAC) está especificada de forma consistente no contrato da API? [Clarity, contracts/api.yaml]
- [ ] CHK020 — Os cabeçalhos `Authorization: Bearer <token>` necessários para endpoints autenticados estão consistentemente declarados no `api.yaml`? [Consistency, contracts/api.yaml]
- [ ] CHK021 — Os schemas de validação de entrada (Zod) para cada endpoint estão referenciados ou deriváveis do contrato da API sem ambiguidade? [Clarity]
- [ ] CHK022 — O endpoint de geração de PDF (orçamento e contrato) está documentado no `api.yaml` com response type `application/pdf`? [Gap]
- [ ] CHK023 — O endpoint público de assinatura de contrato (sem autenticação) está documentado com `security: []` no `api.yaml`? [Completeness]
- [ ] CHK024 — O endpoint de fila pública (`/fila/[slug]`) está documentado com os campos de resposta especificados (posição, placa mascarada, status, tempo estimado)? [Completeness]
- [ ] CHK025 — O formato de mascaramento de placa (ex: `ABC-**34`) está especificado de forma determinística nos requisitos ou contrato? [Clarity, Spec US4 §Cenário 1]

---

## Fluxos de Estado & Edge Cases

- [ ] CHK026 — Todas as transições de status de OS (AGUARDANDO→EM_ANDAMENTO, EM_ANDAMENTO→CONCLUÍDO, qualquer→CANCELADO) estão explicitamente enumeradas? [Completeness, Spec §RF-009]
- [ ] CHK027 — As transições **inválidas** de status de OS (ex: CONCLUÍDO→EM_ANDAMENTO, CANCELADO→AGUARDANDO) estão explicitamente proibidas nos requisitos? [Gap] — spec define transições válidas mas não proíbe explicitamente as inválidas
- [ ] CHK028 — Todas as transições de status de orçamento (RASCUNHO→ENVIADO→APROVADO/REJEITADO, qualquer→EXPIRADO via job, APROVADO→convertido) estão explicitamente enumeradas? [Completeness, Spec §RF-019]
- [ ] CHK029 — Os requisitos do job de expiração de orçamentos definem comportamento de idempotência (reexecução segura do cron) e tratamento de falhas? [Gap, Spec §RF-019]
- [ ] CHK030 — Todas as transições de status de contrato (RASCUNHO→AGUARDANDO_ASSINATURA→ASSINADO, CANCELADO) estão explicitamente enumeradas? [Completeness, Spec §RF-022]
- [ ] CHK031 — O requisito de regeneração de link de assinatura expirado está suficientemente precisado: somente quando status é AGUARDANDO_ASSINATURA **e** link expirado (não após ASSINADO)? [Clarity, Spec §RF-023a]
- [ ] CHK032 — O requisito de reordenamento imediato da fila após conclusão ou cancelamento de OS define comportamento para cenários de conclusão **concorrente** (dois funcionários concluindo simultaneamente)? [Gap, Spec §RF-010]
- [ ] CHK033 — O bloqueio de criação de nova OS para veículo em atendimento cobre o cenário de corrida: dois funcionários tentando criar OS para o mesmo veículo simultaneamente? [Gap, Spec §RF-008]
- [ ] CHK034 — O requisito de conversão de orçamento em OS (RF-019b) define claramente o estado do orçamento **após** a conversão (permanece APROVADO ou muda para algum estado indicativo)? [Clarity, Spec §RF-019b]
- [ ] CHK035 — Os requisitos para o comportamento do sistema quando o estoque fica negativo (permitido com alerta) são suficientemente precisos para distinguir de um erro de validação? [Clarity, Spec §RF-018a]

---

## Observabilidade

- [ ] CHK036 — O esquema de resposta do `GET /api/health` define os campos obrigatórios para cada componente monitorado (banco, MinIO) com os valores possíveis de status? [Completeness, Spec §RF-038, contracts/api.yaml]
- [ ] CHK037 — Os campos obrigatórios de log (timestamp, nível, módulo, tenantId, mensagem) são suficientemente especificados para garantir consistência entre módulos distintos da aplicação? [Clarity, Spec §RF-039]
- [ ] CHK038 — O requisito de não expor stack traces em produção (SC-013) é mensurável e testável sem ambiguidade? [Measurability, Spec §SC-013]
- [ ] CHK039 — Os parâmetros de healthcheck no Docker Compose (interval, timeout, retries, start_period) estão especificados nos requisitos ou é deixado à escolha do implementador? [Gap, Spec §RF-041]
- [ ] CHK040 — O requisito de resposta degradada do `/api/health` (HTTP 503, indicação do componente afetado, < 5 segundos) é suficientemente determinístico para ser validado automaticamente? [Measurability, Spec §SC-012]
- [ ] CHK041 — Os requisitos de log cobrem explicitamente **todos** os módulos críticos: autenticação, uploads, geração de PDF, fila de jobs (BullMQ), notificações WhatsApp? [Coverage, Spec §RF-039]

---

## Plano Técnico vs. Spec

- [ ] CHK042 — Os quatro desvios da constituição (NextAuth→JWT, @react-pdf→Playwright, StorageProvider→S3 direto, 2-3 features→exatamente 2) estão documentados de forma consistente em spec, plan e na constituição? [Consistency, plan.md §Verificação da Constituição]
- [ ] CHK043 — A política de retry do BullMQ para jobs de notificação WhatsApp (tentativas máximas, backoff, dead letter) está especificada nos requisitos? [Gap] — spec menciona "retry automático" sem quantificar
- [ ] CHK044 — Os recursos computacionais (memória, CPU) para o Playwright headless em ambiente containerizado estão endereçados nos requisitos de infraestrutura? [Gap]
- [ ] CHK045 — A estrutura de dados Redis para rate limiting (tipo de chave, TTL, operação atômica) está suficientemente especificada nos requisitos para garantir implementação sem corrida? [Clarity, Spec §RF-004b]
- [ ] CHK046 — As quantidades do seed (RF-032: 2 tenants, 1 gerente + 2 funcionários, 20 OS, etc.) são consistentes entre spec e plan? [Consistency, Spec §RF-032, plan.md §Contexto Técnico]
- [ ] CHK047 — A especificação do polling de 30 segundos (RF-015) define claramente se o intervalo é contado a partir do início ou do fim da requisição anterior? [Clarity, Spec §RF-015]
- [ ] CHK048 — A configuração de vagas simultâneas usada no cálculo de tempo estimado da fila pública (RF-014) especifica o que acontece quando o valor configurado é zero ou indefinido? [Gap, Spec §RF-014]

---

## Requisitos Não-Funcionais

- [ ] CHK049 — Os requisitos de performance P95 < 2s são definidos para **todas** as páginas críticas ou apenas para dashboard e lista de OS? [Coverage, Spec §SC-008]
- [ ] CHK050 — Os requisitos de acessibilidade (WCAG, navegação por teclado, leitores de tela) estão definidos para alguma parte da UI? [Gap] — spec não menciona acessibilidade
- [ ] CHK051 — Os requisitos de responsividade mobile vão além de "design responsivo" — há breakpoints, comportamentos específicos ou limitações de funcionalidade em mobile definidos? [Clarity, Spec §Premissas]
- [ ] CHK052 — Os requisitos de compatibilidade de navegador (versões mínimas suportadas) estão especificados? [Gap]
- [ ] CHK053 — Os requisitos de tratamento de fuso horário para campos de data/hora críticos (validade de orçamento, expiração de link, faturamento do dia) estão especificados? [Gap] — data-intensive features sem spec de timezone podem causar bugs regionais
- [ ] CHK054 — O critério de sucesso SC-007 (PDF em < 5s para até 20 itens) é suficientemente testável em ambiente CI/CD containerizado? [Measurability, Spec §SC-007]

---

## Módulos: Cobertura Completa

- [ ] CHK055 — Os critérios de aceitação de US-5 (Estoque) cobrem o cenário de estoque negativo após saída com alerta visual de forma mensurável? [Measurability, Spec US5]
- [ ] CHK056 — O cálculo de custo médio após entrada de estoque (US5 §Cenário 4) está especificado com fórmula ou regra determinística? [Clarity, Spec US5]
- [ ] CHK057 — Os requisitos de filtragem de histórico de movimentações (por produto e período) definem o comportamento para filtros combinados (produto E período simultâneos)? [Clarity, Spec US5]
- [ ] CHK058 — Os KPIs do dashboard (RF-026) têm definições mensuráveis — ex: "faturamento do dia" inclui OS canceladas? "ordens abertas" inclui EM_ANDAMENTO ou apenas AGUARDANDO? [Clarity, Spec §RF-026]
- [ ] CHK059 — O widget de checklist de onboarding (RF-026a) especifica o mecanismo de persistência do estado de conclusão (server-side ou client-side)? [Gap, Spec §RF-026a]
- [ ] CHK060 — Os requisitos de relatórios (RF-027) definem o comportamento para períodos sem dados (ex: relatório de faturamento para período vazio)? [Gap, Spec §RF-027]
- [ ] CHK061 — O upload do logotipo (RF-028, US9) define os requisitos de dimensões, formato aceito e tamanho máximo de forma consistente com RF-030? [Consistency, Spec §RF-028, §RF-030]
- [ ] CHK062 — Os requisitos de desativação de tipo de serviço (RF-029) especificam o que acontece com OS e orçamentos existentes que referenciam um tipo desativado? [Gap, Spec §RF-029]

---

## Features Extras (WhatsApp & Operações em Lote)

- [ ] CHK063 — As condições de disparo de notificação WhatsApp estão completamente enumeradas: mudança de posição na fila, conclusão de OS, cancelamento de OS? Há outros eventos? [Completeness, Spec US10]
- [ ] CHK064 — Os requisitos definem o comportamento para notificação WhatsApp quando a Twilio está indisponível (silencioso, retry, alerta para gerente)? [Gap, Spec US10]
- [ ] CHK065 — Os requisitos de notificação WhatsApp definem o que acontece quando `whatsappPhone` não está preenchido (silencioso vs. erro)? [Clarity, Spec §RF-005a]
- [ ] CHK066 — As ações em lote disponíveis para ordens (alterar status, atribuir funcionário, adicionar tag) estão completamente especificadas? Especificamente, "adicionar tag" é uma entidade prevista no modelo de dados? [Completeness, Spec US10 §Cenário 4]
- [ ] CHK067 — O requisito de export CSV define as colunas, encoding, delimitador e comportamento para dados com caracteres especiais? [Gap, Spec US10]
- [ ] CHK068 — Os requisitos de operações em lote definem o comportamento para falhas parciais (ex: 8 de 10 ordens atualizadas com sucesso)? [Gap, Spec US10]
- [ ] CHK069 — O requisito de documentação das features extras no README (SC-010) especifica o nível de detalhe exigido (justificativa, instruções de uso, etc.)? [Clarity, Spec §SC-010]

---

## Notas

- Itens marcados `[Gap]` indicam requisitos **ausentes** na documentação atual — precisam ser adicionados ao spec ou explicitamente descartados.
- Itens marcados `[Clarity]` indicam requisitos presentes mas ambíguos — precisam de refinamento antes da implementação.
- Itens marcados `[Consistency]` indicam discrepâncias entre artefatos — requerem alinhamento.
- Itens marcados `[Measurability]` indicam requisitos que podem não ser verificáveis objetivamente.
- Prioridade sugerida de resolução: `[Gap]` em módulos críticos (Auth, Tenancy, State Flows) > `[Gap]` em módulos secundários > `[Clarity]` > `[Consistency]` > `[Measurability]`.
