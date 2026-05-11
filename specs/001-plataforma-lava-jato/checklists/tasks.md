# Checklist de Qualidade das Tarefas: FlowCar — Plataforma Micro-SaaS

**Objetivo**: Validar completude, clareza, consistência, mensurabilidade e rastreabilidade do tasks.md antes do início da implementação
**Criado em**: 2026-05-08
**Audiência**: Autor (auto-revisão) + Tech Lead (revisão de pares)
**Feature**: [tasks.md](../tasks.md) | [spec.md](../spec.md) | [plan.md](../plan.md) | [data-model.md](../data-model.md)
**Domínios cobertos**: Completude de requisitos, Clareza das tarefas, Consistência estrutural, Critérios de aceitação mensuráveis, Cobertura de segurança, Cobertura do modelo de dados, Deploy & operações, Cobertura de edge cases, Rastreabilidade, Prontidão para implementação

---

## Completude de Requisitos

- [ ] CHK001 — Existe pelo menos uma tarefa rastreável para cada um dos 41 Requisitos Funcionais (RF-001 a RF-041) da spec? Algum RF fica sem tarefa explícita que o implemente? [Completeness, Spec §Requisitos Funcionais, tasks.md T001–T145]
- [ ] CHK002 — Todas as 17 entidades do data-model.md (Tenant, User, CarWashConfig, Customer, Vehicle, ServiceType, Product, StockMovement, Quote, QuoteItem, Contract, ContractSignature, ServiceOrder, ServiceOrderItem, QueueEntry, FileUpload, WhatsAppNotification) estão cobertas em T008 (schema.prisma)? [Completeness, data-model.md §Entidades, tasks.md T008]
- [ ] CHK003 — Os 3 workers BullMQ necessários (whatsapp-notifications T129, quote-expiration T093, bootstrap/inicialização T140) estão todos representados em tarefas distintas com responsabilidades claramente separadas? [Completeness, Spec §RF-019, research.md §5, tasks.md T093/T129/T140]
- [ ] CHK004 — Existe tarefa explícita para a página pública de assinatura de contrato (`/contratos/assinar/[token]`) acessível sem autenticação (T111)? Essa restrição de "sem auth" está claramente especificada na descrição da tarefa? [Completeness, Spec §RF-023, tasks.md T111]
- [ ] CHK005 — Os requisitos de SC-007 (PDF em < 5 s para ≤ 20 itens) e SC-008 (P95 < 2 s em dashboard/lista de OS com 5 usuários) estão representados em alguma tarefa com critério de aceitação mensurável, ou ficam apenas nos Critérios de Sucesso da spec sem tarefa correspondente? [Completeness, Spec §SC-007/SC-008, tasks.md T091/T143]

---

## Clareza das Tarefas

- [ ] CHK006 — Os **checkpoints** ao final de cada fase definem critérios observáveis e objetivos (ex: "retorna 200", "resequencia sem lacunas"), em vez de termos vagos como "funcional" ou "testável"? [Clarity, tasks.md §Checkpoints de fase]
- [ ] CHK007 — A descrição do **Independent Test** de cada user story é específica o suficiente para que um desenvolvedor diferente do autor possa executá-la sem perguntar ao autor como proceder? [Clarity, tasks.md §Independent Test por fase]
- [ ] CHK008 — T063 (upload endpoint) especifica claramente que a validação do backend deve ocorrer **independentemente** da validação do frontend, retornando HTTP 422 mesmo se o frontend for contornado? [Clarity, Spec §RF-030, tasks.md T063]
- [ ] CHK009 — T015 (rate limiting por IP em Redis) especifica a estrutura da chave de lookup (`auth:login:attempts:{ip}`), o comportamento de reset após a janela de 15 min, e o que acontece com requisições do mesmo IP após atingir o limite? [Clarity, Spec §RF-004b, tasks.md T015]
- [ ] CHK010 — T140 (bootstrap de workers BullMQ) especifica claramente o mecanismo que evita re-inicialização em hot-reloads do Next.js (ex: `global.__workers_initialized`), ou deixa esse detalhe para o implementador descobrir? [Clarity, tasks.md T140]
- [ ] CHK011 — T071 (queue-public.ts) especifica claramente o algoritmo de cálculo do tempo estimado: `SUM(serviceMinutes dos veículos à frente) / simultaneousSlots`? A fórmula é determinística o suficiente para ser implementada sem ambiguidade? [Clarity, Spec §RF-014, tasks.md T071]

---

## Consistência Estrutural

- [ ] CHK012 — Os caminhos de arquivo especificados nas tarefas (ex: `src/lib/auth/jwt.ts`, `src/server/services/`) são consistentes com a estrutura de projeto documentada em plan.md §Estrutura de código planejada? [Consistency, plan.md §Estrutura, tasks.md §Todas as fases]
- [ ] CHK013 — As restrições de RBAC declaradas nas tarefas de Route Handler (GERENTE only, assert tenantId) são consistentes com RF-002 — especificamente, FUNCIONÁRIO bloqueado de exatamente 4 seções: Funcionários, Contratos, Relatórios e Configurações? Alguma seção foi adicionada ou omitida nas tarefas? [Consistency, Spec §RF-002, tasks.md T018/T029/T104/T116]
- [ ] CHK014 — Os atributos do cookie de refresh token declarados em T034 (HttpOnly) são consistentes com T015 (redis.ts) e com research.md §3 (Secure, SameSite)? Alguma tarefa menciona `Secure` e `SameSite` ou isso foi omitido? [Consistency, research.md §3, tasks.md T015/T034]
- [ ] CHK015 — O padrão `assertTenantOwnership` definido em T019 (rbac.ts) é explicitamente referenciado em **todas** as tarefas de Route Handler que manipulam recursos de tenant (T049, T051, T060, T082, T095, T105, T125)? Algum Route Handler de recurso protegido omite essa referência? [Consistency, Spec §RF-033, tasks.md T019/T049–T125]
- [ ] CHK016 — A tabela de dependências entre user stories em tasks.md é consistente com as dependências implícitas no spec? Especificamente: US6 depende de US3 (conversão de orçamento em OS); US10 depende de US8 (exportação CSV) — ambas estão documentadas? [Consistency, tasks.md §User Story Dependencies]

---

## Critérios de Aceitação e Mensurabilidade

- [ ] CHK017 — O critério de aceitação de T020 (`/api/health`) inclui os dois cenários mensuráveis da spec: resposta em < 2 s quando saudável (SC-011) **e** resposta em < 5 s com HTTP 503 quando degradado (SC-012)? [Measurability, Spec §SC-011/SC-012, tasks.md T020]
- [ ] CHK018 — SC-003 (`docker compose up -d` operacional em < 5 min) é rastreável a uma tarefa específica com critério de aceitação mensurável (ex: T144), ou permanece apenas como critério de sucesso sem cobertura em tasks? [Measurability, Spec §SC-003, tasks.md T144]
- [ ] CHK019 — SC-004 (100% das páginas acessíveis e funcionais com dados do seed) é verificável a partir das tarefas de seed (T138) e validação (T143)? Os dados do seed especificados em T138 são quantitativamente consistentes com RF-032 (2 tenants, 1 gerente + 2 funcionários, 10 produtos, 8 tipos de serviço, 15 clientes, 20 veículos, 5 orçamentos, 3 contratos, 20 OS)? [Measurability, Spec §SC-004/RF-032, tasks.md T138]
- [ ] CHK020 — O checkpoint da Fase 2 ("Foundation ready — `/api/health` retorna 200; Prisma migrations aplicadas; todos os arquivos lib compilam sem erros") é objetivo o suficiente para ser verificado por uma pipeline de CI sem julgamento humano? [Measurability, tasks.md §Checkpoint Fase 2]

---

## Cobertura de Segurança

- [ ] CHK021 — A exigência de nunca expor `signedIp` em respostas de API ou logs (SC-006) está representada em T103 (contract-template.ts — "signer IP masked display") e em T145 (security review)? A cobertura é suficiente para prevenir vazamento acidental? [Coverage, Spec §SC-006/RF-024, tasks.md T103/T145]
- [ ] CHK022 — A exigência de armazenar o token de assinatura pública **apenas como hash SHA-256** (nunca o token bruto em banco) está explicitamente especificada em T102 (`publicTokenHash`)? Existe tarefa que cubra a geração criptograficamente segura do token bruto? [Coverage, Spec §RF-023, data-model.md §Contract, tasks.md T102]
- [ ] CHK023 — Todas as tarefas de geração de pre-signed URL (T017 e T069/T107 que a utilizam) exigem explicitamente a verificação de propriedade de tenant **antes** de gerar a URL? Ou alguma tarefa permite gerar a URL com base apenas no `objectKey`? [Coverage, Spec §RF-036, tasks.md T017/T069]
- [ ] CHK024 — O endpoint de batch (T133) inclui explicitamente a validação de que **todos os IDs pertencem ao tenant da sessão**, evitando que um tenant altere registros de outro tenant via batch? [Coverage, Spec §RF-033, tasks.md T133]
- [ ] CHK025 — As tarefas de validação Zod (T022, T032, T044, T056, T078, T089, T101, T121, T132) cobrem **todos** os endpoints de entrada de dados? Existe algum Route Handler de escrita (POST/PATCH) sem tarefa de validação Zod correspondente? [Coverage, Spec §RF-002–RF-037, tasks.md §Fases 3–13]
- [ ] CHK026 — SC-013 (nenhuma resposta de API em produção contém stack trace) é rastreável a uma tarefa específica? T021 (api-error.ts + global error handler) especifica que erros internos são sempre retornados como mensagem genérica ao cliente? [Coverage, Spec §SC-013, tasks.md T021]

---

## Cobertura de Edge Cases

- [ ] CHK027 — O cenário de corrida (dois proprietários tentando registrar o mesmo slug simultaneamente) está coberto em T023 (`createTenant` — "slug uniqueness conflict returns 'slug já está em uso' without exposing DB error")? A estratégia de tratamento do conflito de constraint `UNIQUE` está especificada? [Edge Case, Spec §RF-035/§Casos de Borda, tasks.md T023]
- [ ] CHK028 — O bloqueio de segunda conversão de orçamento em OS (T090) especifica o formato da resposta de erro quando `convertedOrderId` já está preenchido (número/link da OS existente)? [Edge Case, Spec §RF-019b/§Casos de Borda, tasks.md T090]
- [ ] CHK029 — O cenário de desativação de veículo com OS ativa está coberto em T047 (`vehicle.service.ts` — deactivation blocked if active OS)? O critério "OS ativa" está definido como `AGUARDANDO` OR `EM_ANDAMENTO`, e não apenas `EM_ANDAMENTO`? [Edge Case, Spec §Casos de Borda, tasks.md T047]
- [ ] CHK030 — A restrição de regeneração de link de assinatura (T102 — `regenerateLink` only for non-ASSINADO contracts) está específica o suficiente para distinguir os casos: link expirado com status AGUARDANDO_ASSINATURA (permitido) vs. contrato já ASSINADO (bloqueado)? [Edge Case, Spec §RF-023a, tasks.md T102]
- [ ] CHK031 — O comportamento de estoque negativo (permitido com alerta, sem bloqueio) está coberto tanto em T088 (integração do alerta no ServiceOrderForm) quanto em T080 (stock.service — `currentStock` pode ficar negativo)? O cenário de decremento abaixo de zero está explicitamente previsto em alguma tarefa? [Edge Case, Spec §RF-018a/§Casos de Borda, tasks.md T080/T088]

---

## Cobertura do Modelo de Dados

- [ ] CHK032 — Todos os 9 enums do data-model.md (UserRole, ServiceOrderStatus, QueueStatus, QuoteStatus, ContractStatus, StockMovementType, FileCategory, NotificationStatus, NotificationEvent) estão cobertos em T008 (schema.prisma)? A task menciona enums explicitamente ou deixa implícito? [Coverage, data-model.md §Enums, tasks.md T008]
- [ ] CHK033 — Os campos de auditoria de WhatsApp (`attempts`, `lastError`, `providerMessageId`) presentes no data-model.md estão representados em T129/T130 com comportamento especificado (incremento de `attempts` a cada tentativa, `lastError` salvo em caso de falha)? [Coverage, data-model.md §WhatsAppNotification, tasks.md T129/T130]
- [ ] CHK034 — O campo `ContractSignature.signedUserAgent` do data-model.md está representado em T102 (`signContract` — "signedIp + signedUserAgent")? O tratamento desse campo no template de PDF (T103) está definido como omitido ou incluído? [Coverage, data-model.md §ContractSignature, tasks.md T102/T103]
- [ ] CHK035 — O estado derivado "Checklist de onboarding" (calculado a partir de 3 fatos, sem tabela dedicada) documentado em data-model.md §Estado derivado está representado em T031 (`getOnboardingState`) com os 3 critérios exatos: slug válido, ao menos 1 ServiceType ativo, ao menos 1 User com papel FUNCIONARIO? [Coverage, data-model.md §Estado derivado, tasks.md T031]

---

## Deploy & Operações

- [ ] CHK036 — T001 (`.env.example`) lista **todas** as variáveis de ambiente necessárias para todos os serviços integrados: DATABASE_URL, REDIS_URL, MINIO_*, JWT_*, TWILIO_*, NEXT_PUBLIC_APP_URL? Existe alguma variável consumida no código (ex: `NODE_ENV`, `PORT`, `PLAYWRIGHT_*`) que esteja ausente? [Completeness, plan.md §Contexto Técnico, tasks.md T001]
- [ ] CHK037 — T002 (docker-compose.yml) especifica os parâmetros do health check do serviço app (interval, timeout, retries, start_period), ou deixa esses valores para o implementador definir livremente? A ausência de especificação pode causar divergência entre environments? [Gap, Spec §RF-041, tasks.md T002]
- [ ] CHK038 — T138 (seed) cobre todos os status de orçamento e contrato necessários para que SC-004 (100% das páginas funcionais) seja verificável — especificamente: orçamentos em todos os status (RASCUNHO, ENVIADO, APROVADO, REJEITADO, EXPIRADO) e contratos nos 3 status críticos (RASCUNHO, AGUARDANDO_ASSINATURA, ASSINADO)? [Completeness, Spec §SC-004/RF-032, tasks.md T138]

---

## Rastreabilidade e Prontidão para Implementação

- [ ] CHK039 — As tarefas referenciam os identificadores de requisito (RF-XXX, SC-XXX) da spec em suas descrições, ou apenas descrevem o que fazer sem indicar o requisito que satisfazem? A ausência de referências de rastreabilidade dificulta validação de cobertura? [Traceability, tasks.md §T001–T145]
- [ ] CHK040 — Existe alguma dependência de biblioteca ou serviço externo (Playwright headless, Twilio, MinIO SDK, BullMQ) que precisa de configuração especial de ambiente antes que os implementadores possam executar a aplicação localmente, e que **não** está coberta por nenhuma tarefa de setup ou documento de quickstart? [Implementation Readiness, tasks.md T004/T139/T143, Spec §quickstart.md]
