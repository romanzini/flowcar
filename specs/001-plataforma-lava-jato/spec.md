# Especificação de Feature: Plataforma Micro-SaaS para Gestão de Lava-Jatos

**Branch**: `001-plataforma-lava-jato`
**Criado em**: 2026-05-08
**Status**: Rascunho
**Entrada**: planejamento.md — Plataforma completa de gestão de lava-jatos

---

## Clarificações

### Sessão 2026-05-08

- Q: A unicidade da placa de veículo é global (em toda a plataforma) ou por tenant? → A: Por tenant — a mesma placa pode existir em lava-jatos (tenants) diferentes sem conflito.
- Q: Como funciona a conversão de orçamento aprovado em ordem de serviço? → A: Conversão manual via botão "Converter em OS" — o sistema pré-preenche a nova OS com os itens e preços do orçamento e exige confirmação do gerente antes de criar a OS.
- Q: O que acontece ao tentar desativar um cliente ou veículo com registros ativos vinculados? → A: O sistema bloqueia a desativação e informa ao usuário quais ordens abertas ou contratos pendentes precisam ser encerrados antes.
- Q: Após conclusão ou cancelamento de uma OS, as posições dos demais veículos na fila são recalculadas? → A: Sim — reordenação imediata; as posições são sempre seqüeônciais e sem lacunas.
- Q: Como é implementado o guia de primeiros passos do onboarding? → A: Widget de checklist persistente no dashboard com 3 tarefas iniciais (configurar slug, cadastrar tipo de serviço, adicionar funcionário); desaparece automaticamente ao concluir todas.
- Q: O que acontece quando um usuário tenta fazer login com conta desativada (`isActive: false`)? → A: Retorna mensagem genérica "Credenciais inválidas." sem distinguir conta inativa de senha errada, prevenindo enumeração de contas.
- Q: O que acontece quando o gerente tenta converter em OS um orçamento já convertido anteriormente? → A: O sistema bloqueia a ação com mensagem explicativa e exibe referência (link ou número) para a OS já gerada a partir daquele orçamento.
- Q: O que acontece quando o estoque de um produto chega a zero e uma OS tenta utilizá-lo? → A: Permitido com aviso — o sistema permite adicionar o produto à OS, mas exibe alerta visual de estoque zerado; o estoque pode ficar negativo.
- Q: O que acontece quando o slug configurado contém caracteres especiais? → A: Rejeitado com mensagem de validação — o sistema aceita apenas letras minúsculas, números e hífens (`[a-z0-9-]`); qualquer outro caractere gera erro de validação.
- Q: O que acontece quando dois proprietários tentam cadastrar o mesmo slug simultaneamente? → A: Constraint `UNIQUE` no banco garante atomicidade; se o insert falhar por conflito, o sistema retorna mensagem genérica "slug já está em uso" sem expor detalhes do erro de banco.
- Q: Qual nível de proteção contra força bruta deve ser implementado no endpoint de login? → A: Rate limiting por IP — bloquear/atrasar após N tentativas consecutivas falhas por IP, sem bloqueio de conta.
- Q: Como deve ser implementada a geração de PDF (orçamentos e contratos)? → A: Server-side HTML-to-PDF via navegador headless (Puppeteer ou Playwright) — sem serviço externo.
- Q: Como deve ser tratada a invalidação de sessão JWT? → A: Access token de curta duração + refresh token server-side (armazenado em banco/Redis); revogação do refresh token invalida a sessão imediatamente.
- Q: Como os arquivos armazenados no MinIO devem ser servidos aos usuários? → A: Pre-signed URLs geradas pelo servidor com validade limitada; os objetos permanecem privados no MinIO.
- Q: Como a posição na fila deve ser exibida quando há múltiplas vagas simultâneas ativas? → A: Veículos EM_ANDAMENTO exibidos como "Em Atendimento" (sem posição numérica); apenas veículos AGUARDANDO recebem posições sequenciais (1, 2, 3…).

---

## Cenários de Uso e Testes *(obrigatório)*

### User Story 1 — Autenticação e Controle de Acesso por Papel (Prioridade: P1)

Um funcionário ou gerente acessa o sistema com e-mail e senha. Após o login, o sistema apresenta apenas as funcionalidades permitidas para o papel do usuário: gerentes têm acesso completo; funcionários não acessam áreas administrativas (funcionários, contratos, relatórios, configurações).

**Por que esta prioridade**: Todas as demais funcionalidades dependem de uma sessão autenticada e de papéis devidamente controlados. Sem autenticação funcional, nenhum outro fluxo pode ser exercitado.

**Teste Independente**: Pode ser testado criando dois tenants (lava-jatos distintos) via seed, cada um com um GERENTE e um FUNCIONÁRIO, fazendo login com cada usuário e verificando que: (a) itens restritos não aparecem para o funcionário; (b) um usuário de um tenant não enxerga dados do outro tenant.

**Cenários de Aceitação**:

1. **Dado** que um gerente acessa `/login`, **Quando** informa e-mail e senha válidos, **Então** é redirecionado ao dashboard e vê todos os itens do menu lateral.
2. **Dado** que um funcionário acessa `/login`, **Quando** informa e-mail e senha válidos, **Então** é redirecionado ao dashboard e **não** vê os itens: Funcionários, Contratos, Relatórios, Configurações.
3. **Dado** que qualquer usuário tenta acessar uma rota protegida sem sessão ativa, **Quando** o sistema detecta a ausência de sessão, **Então** redireciona para `/login`.
4. **Dado** que um funcionário tenta acessar diretamente a URL `/funcionarios`, **Quando** o sistema verifica o papel, **Então** retorna acesso negado.
5. **Dado** que um usuário informa senha incorreta, **Quando** submete o formulário, **Então** recebe mensagem de erro sem revelar qual campo está incorreto.

---

### User Story 2 — Gestão de Clientes e Veículos (Prioridade: P2)

Um gerente ou funcionário cadastra clientes com seus dados e associa um ou mais veículos a cada cliente. Os dados do cliente e do veículo são necessários para criar ordens de serviço.

**Por que esta prioridade**: Clientes e veículos são a base de dados que alimenta ordens de serviço, orçamentos e contratos. Sem eles, o fluxo operacional não pode ser iniciado.

**Teste Independente**: Pode ser testado cadastrando um cliente, adicionando dois veículos a ele, editando um veículo e verificando que a placa é única no sistema.

**Cenários de Aceitação**:

1. **Dado** que um funcionário acessa a lista de clientes, **Quando** preenche o formulário com nome, telefone e CPF/CNPJ válidos, **Então** o cliente é salvo e aparece na lista.
2. **Dado** que um funcionário acessa o perfil de um cliente, **Quando** adiciona um veículo informando placa, marca, modelo, ano e cor, **Então** o veículo é salvo e vinculado ao cliente.
3. **Dado** que um usuário tenta cadastrar um veículo com placa já existente **no mesmo lava-jato (tenant)**, **Quando** submete o formulário, **Então** recebe mensagem de erro de placa duplicada. Placas idênticas em tenants distintos são permitidas.
4. **Dado** que um gerente acessa a lista de clientes, **Quando** busca por nome ou telefone, **Então** a lista é filtrada em tempo real.
5. **Dado** que um usuário edita os dados de um cliente existente, **Quando** salva, **Então** os dados atualizados são refletidos imediatamente na lista.

---

### User Story 3 — Ordens de Serviço e Fila Interna (Prioridade: P3)

Um funcionário cria uma ordem de serviço para um veículo, seleciona os serviços e produtos utilizados e controla o status do atendimento (aguardando → em andamento → concluído). A criação da ordem insere automaticamente o veículo na fila de atendimento interna.

**Por que esta prioridade**: Ordens de serviço são o coração operacional do sistema. Representam a atividade-fim do lava-jato e geram os dados de faturamento e relatórios.

**Teste Independente**: Pode ser testado criando uma ordem para um veículo existente, movendo o status para "Em Andamento" e depois para "Concluído", e verificando que a entrada na fila é atualizada a cada transição.

**Cenários de Aceitação**:

1. **Dado** que um funcionário acessa "Ordens de Serviço" e seleciona um cliente e veículo, **Quando** adiciona itens de serviço e confirma, **Então** a ordem é criada com status AGUARDANDO e um número sequencial (ex: OS-0001).
2. **Dado** que uma ordem está com status AGUARDANDO, **Quando** um funcionário a move para EM_ANDAMENTO, **Então** o horário de início é registrado e a posição na fila interna é atualizada.
3. **Dado** que uma ordem está EM_ANDAMENTO, **Quando** o funcionário a move para CONCLUÍDO, **Então** o horário de conclusão é registrado e a entrada da ordem sai da fila ativa.
4. **Dado** que uma ordem é criada, **Quando** o funcionário faz upload de fotos do veículo, **Então** as imagens ficam associadas à ordem e são visíveis no detalhamento.
5. **Dado** que uma ordem é cancelada, **Quando** o status muda para CANCELADO, **Então** a entrada correspondente é removida da fila ativa.

---

### User Story 4 — Fila Pública de Atendimento (Prioridade: P4)

Um cliente externo acessa uma URL pública configurada pelo gerente e visualiza em tempo real a posição do seu veículo na fila, com placa parcialmente mascarada, status atual e tempo estimado de atendimento. A página se atualiza automaticamente a cada 30 segundos.

**Por que esta prioridade**: A fila pública é um diferencial de atendimento que não requer autenticação, pode ser demonstrada de forma independente e agrega valor imediato ao cliente final.

**Teste Independente**: Pode ser testado configurando um slug nas configurações, criando 3 ordens em status AGUARDANDO e acessando `/<slug>` em modo anônimo para verificar posição, placa mascarada e tempo estimado.

**Cenários de Aceitação**:

1. **Dado** que o gerente configurou o slug "lava-jato-centro", **Quando** qualquer pessoa acessa `/fila/lava-jato-centro`, **Então** vê a lista de veículos na fila com posição, placa mascarada (ex: ABC-\*\*34), status e tempo estimado.
2. **Dado** que há 3 veículos na fila e 2 vagas simultâneas configuradas, **Quando** a página é acessada, **Então** o tempo estimado de cada veículo é calculado corretamente com base nos serviços dos veículos à frente.
3. **Dado** que a página pública está aberta, **Quando** passam 30 segundos, **Então** a lista é atualizada automaticamente sem recarregar a página.
4. **Dado** que a fila está vazia, **Quando** alguém acessa a URL pública, **Então** vê uma mensagem informando que não há veículos em atendimento no momento.
5. **Dado** que o slug informado na URL não existe, **Quando** a página é carregada, **Então** exibe mensagem de lava-jato não encontrado.

---

### User Story 5 — Controle de Estoque (Prioridade: P5)

Um gerente ou funcionário cadastra produtos (shampoo, cera, etc.), registra entradas e saídas de estoque e é alertado quando algum produto atinge o estoque mínimo configurado.

**Por que esta prioridade**: O controle de estoque é operacionalmente importante mas não bloqueia os fluxos principais. Pode ser desenvolvido e testado de forma completamente independente.

**Teste Independente**: Pode ser testado cadastrando um produto com estoque mínimo, registrando saídas até atingir o nível crítico e verificando que o alerta de baixo estoque é exibido.

**Cenários de Aceitação**:

1. **Dado** que um gerente acessa Inventário, **Quando** cadastra um produto com nome, unidade, estoque atual e estoque mínimo, **Então** o produto é salvo e aparece na lista.
2. **Dado** que um funcionário registra uma saída de estoque, **Quando** informa produto, quantidade e motivo, **Então** o estoque atual é decrementado e a movimentação é registrada no histórico.
3. **Dado** que o estoque de um produto atinge ou fica abaixo do mínimo, **Quando** a lista de produtos é exibida, **Então** o produto é destacado visualmente como crítico.
4. **Dado** que um gerente registra uma entrada de estoque, **Quando** informa produto, quantidade e custo unitário, **Então** o estoque é atualizado e o custo médio é recalculado.
5. **Dado** que o histórico de movimentações é acessado, **Quando** o usuário filtra por produto ou período, **Então** a lista exibe apenas os registros correspondentes.

---

### User Story 6 — Orçamentos e Geração de PDF (Prioridade: P6)

Um gerente cria orçamentos para clientes, adiciona itens de serviço com preços e descontos, e gera um PDF do orçamento para envio ao cliente. O orçamento pode ser aprovado, rejeitado ou expirado.

**Por que esta prioridade**: Orçamentos complementam o fluxo comercial mas podem ser demonstrados independentemente da execução das ordens de serviço.

**Teste Independente**: Pode ser testado criando um orçamento com 2 itens, aplicando desconto em um deles, gerando o PDF e verificando que o total calculado está correto.

**Cenários de Aceitação**:

1. **Dado** que um gerente acessa Orçamentos, **Quando** seleciona um cliente, através do nome ou telefone, adiciona serviços com quantidade e desconto e confirma, **Então** o orçamento é criado com número sequencial (ex: ORC-0001) e status RASCUNHO.
2. **Dado** que um orçamento existe, **Quando** o gerente clica em "Gerar PDF", **Então** um arquivo PDF é gerado com os dados do cliente, itens, valores e total.
3. **Dado** que um orçamento tem status RASCUNHO, **Quando** o gerente altera o status para ENVIADO, **Então** o status é atualizado e a data de envio é registrada.
4. **Dado** que um orçamento está APROVADO, **Quando** o gerente clica em "Converter em Ordem de Serviço", **Então** o sistema exibe um formulário de nova OS pré-preenchido com o cliente, veículo e itens do orçamento; após confirmação, a OS é criada e o orçamento registra a referência à OS gerada.
5. **Dado** que um orçamento tem desconto aplicado em um item, **Quando** o subtotal e o total são calculados, **Então** refletem o valor com desconto corretamente.

---

### User Story 7 — Contratos e Assinatura Digital (Prioridade: P7)

Um gerente cria contratos de prestação de serviços, envia o link de assinatura ao cliente e o cliente assina digitalmente pelo navegador sem precisar criar uma conta. O contrato assinado gera um PDF com os dados da assinatura.

**Por que esta prioridade**: Contratos são um recurso de formalização importante mas secundário em relação às operações diárias. O fluxo de assinatura pública é independente e pode ser demonstrado separadamente.

**Teste Independente**: Pode ser testado criando um contrato, copiando o link de assinatura, acessando-o em aba anônima, assinando com o pad digital e verificando que o status muda para ASSINADO.

**Cenários de Aceitação**:

1. **Dado** que um gerente acessa Contratos e cria um contrato com título, conteúdo e cliente, **Quando** salva, **Então** o contrato é criado com número sequencial (ex: CTR-0001) e status RASCUNHO.
2. **Dado** que um contrato está em AGUARDANDO_ASSINATURA, **Quando** o cliente acessa o link público e assina com o pad digital, **Então** o status muda para ASSINADO e os dados da assinatura (imagem e IP) são armazenados.
3. **Dado** que um contrato foi assinado, **Quando** o gerente acessa o detalhamento, **Então** pode visualizar e baixar o PDF do contrato com a assinatura incorporada.
4. **Dado** que um contrato está ASSINADO, **Quando** qualquer usuário tenta acessar o link de assinatura novamente, **Então** vê uma mensagem informando que o contrato já foi assinado.

---

### User Story 8 — Relatórios e Dashboard com KPIs (Prioridade: P8)

Um gerente acessa o dashboard com indicadores de desempenho em tempo real (faturamento do dia, ordens em andamento, estoque crítico) e consulta relatórios detalhados de faturamento, serviços mais realizados e movimentação de estoque por período.

**Por que esta prioridade**: Relatórios dependem de dados gerados pelos demais módulos. São valiosos para gestão mas não bloqueiam as operações.

**Teste Independente**: Pode ser testado com os dados do seed (20 ordens nos últimos 30 dias) verificando que o dashboard exibe KPIs corretos e que os relatórios filtram por período.

**Cenários de Aceitação**:

1. **Dado** que um gerente acessa o dashboard, **Quando** a página carrega, **Então** vê os KPIs: faturamento do dia, quantidade de ordens abertas, ordens concluídas no mês e produtos com estoque crítico.
2. **Dado** que um gerente acessa Relatórios e seleciona "Faturamento", **Quando** informa um período de datas, **Então** vê o total faturado e a receita por tipo de serviço no período.
3. **Dado** que um gerente acessa o relatório de serviços, **Quando** o relatório é exibido, **Então** lista os tipos de serviço ordenados por frequência de execução.
4. **Dado** que um gerente acessa o relatório de clientes, **Quando** o relatório é exibido, **Então** lista os clientes com maior volume de serviços no período selecionado.
5. **Dado** que um gerente acessa o relatório de estoque, **Quando** seleciona um período, **Então** vê o histórico de movimentações com entradas, saídas e saldo final por produto.

---

### User Story 9 — Configurações do Sistema (Prioridade: P9)

Um gerente configura os dados do lava-jato (nome, slug da fila pública, vagas simultâneas, endereço, telefone e logotipo) e cadastra os tipos de serviço com preços base e tempo estimado.

**Por que esta prioridade**: Configurações são necessárias para personalizar a plataforma mas podem ser feitas a qualquer momento após o bootstrap do sistema.

**Teste Independente**: Pode ser testado alterando o slug e verificando que a URL pública da fila passa a responder pelo novo slug. Cadastrar um tipo de serviço e verificar que ele aparece na seleção ao criar uma ordem.

**Cenários de Aceitação**:

1. **Dado** que um gerente acessa Configurações, **Quando** atualiza o nome do estabelecimento e o slug, **Então** o nome aparece no cabeçalho da aplicação e a fila pública responde pelo novo slug.
2. **Dado** que um gerente cadastra um novo tipo de serviço com nome, preço base e tempo estimado em minutos, **Quando** salva, **Então** o serviço fica disponível para seleção em ordens de serviço e orçamentos.
3. **Dado** que um gerente altera o número de vagas simultâneas, **Quando** o cálculo de tempo estimado da fila é executado, **Então** usa o novo valor configurado.
4. **Dado** que um gerente faz upload do logotipo, **Quando** a página é recarregada, **Então** o logotipo aparece no cabeçalho da aplicação e na fila pública.

---

### User Story 10 — Features Extras Escolhidas pelo Implementador (Prioridade: P10)

O implementador escolhe e implementa de 2 a 3 funcionalidades extras que agreguem valor ao produto. A escolha é documentada no README com justificativa.

**Por que esta prioridade**: As features extras são complementares. Devem ser implementadas após todas as funcionalidades core estarem estáveis.

**Teste Independente**: Cada feature extra deve ter seus próprios cenários de aceitação definidos pelo implementador no momento da escolha.

**Cenários de Aceitação**:

1. **Dado** que o implementador escolheu as features extras, **Quando** o README é consultado, **Então** lista as features escolhidas com justificativa de cada uma.
2. **Dado** que cada feature extra está implementada, **Quando** testada isoladamente, **Então** funciona conforme o esperado sem impactar as funcionalidades core.

---

### User Story 11 — Cadastro e Onboarding de Novo Lava-Jato (Prioridade: P0)

Um proprietário de lava-jato acessa a plataforma, cria uma conta para o seu estabelecimento e é automaticamente configurado como gerente do seu próprio espaço isolado. Cada lava-jato cadastrado opera de forma completamente independente dos demais na mesma instância.

**Por que esta prioridade**: Multi-tenancy é o fundamento da plataforma. Sem o cadastro e isolamento de tenants, nenhuma outra funcionalidade faz sentido em um contexto SaaS.

**Teste Independente**: Pode ser testado cadastrando dois lava-jatos distintos, criando dados em cada um e verificando que os dados de um não aparecem nas listagens do outro.

**Cenários de Aceitação**:

1. **Dado** que um proprietário acessa a página de cadastro, **Quando** informa nome do estabelecimento, slug desejado, seu nome, e-mail e senha, **Então** um novo tenant é criado, seu usuário é criado como GERENTE e ele é redirecionado ao dashboard do seu lava-jato.
2. **Dado** que um proprietário tenta cadastrar um slug já utilizado por outro lava-jato, **Quando** submete o formulário, **Então** recebe mensagem de erro informando que o slug já está em uso.
3. **Dado** que dois lava-jatos estão cadastrados na mesma instância, **Quando** um gerente do lava-jato A acessa qualquer listagem (clientes, ordens, estoque), **Então** vê apenas os dados do seu próprio lava-jato.
4. **Dado** que um usuário de um tenant tenta acessar um recurso de outro tenant via URL direta, **Quando** o sistema verifica o vínculo do usuário, **Então** retorna acesso negado.
5. **Dado** que um proprietário conclui o onboarding, **Quando** acessa o dashboard pela primeira vez, **Então** vê um widget de checklist de primeiros passos com as tarefas iniciais (configurar slug da fila pública, cadastrar pelo menos um tipo de serviço, adicionar um funcionário). O widget desaparece automaticamente quando todas as tarefas são concluídas.

---

### Casos de Borda

- Como o sistema trata a tentativa de desativar um cliente com ordens abertas ou contratos pendentes de assinatura? *(bloqueado com mensagem indicando os registros impeditivos)*
- O que acontece quando o gerente tenta converter em OS um orçamento que já foi convertido anteriormente? *(bloqueado com mensagem e referência ao número da OS já gerada)*
- O que acontece quando um cliente tenta assinar um contrato já assinado?
- Como o sistema lida com o upload de um arquivo com tipo não permitido ou acima de 10 MB?
- O que acontece quando o estoque de um produto chega a zero e uma ordem tenta utilizá-lo? *(permitido com alerta visual; estoque pode ficar negativo)*
- Como o sistema trata a criação de uma ordem de serviço para um veículo já em atendimento?
- O que acontece quando o slug configurado contém caracteres especiais? *(rejeitado com mensagem de validação; aceitar apenas `[a-z0-9-]`)*
- Como o sistema responde a um login com conta desativada (`isActive: false`)? *(retorna mensagem genérica "Credenciais inválidas." — sem distinção de causa)*
- O que acontece quando dois proprietários tentam cadastrar o mesmo slug simultaneamente? *(constraint `UNIQUE` no banco garante atomicidade; retorna "slug já está em uso" sem expor erro interno)*
- Como o sistema isola os arquivos (fotos, PDFs) de tenants distintos no armazenamento?

---

## Requisitos *(obrigatório)*

### Requisitos Funcionais

**Autenticação e Acesso**
- **RF-001**: O sistema DEVE autenticar usuários por e-mail e senha utilizando JWT com dois tokens: (a) access token de curta duração (15 minutos) enviado no corpo da resposta; (b) refresh token de longa duração (7 dias) armazenado server-side (banco de dados ou Redis) e enviado como cookie HttpOnly. O logout e a desativação de conta DEVEM revogar o refresh token imediatamente, invalidando a sessão sem dependência do tempo de expiração do access token.
- **RF-002**: O sistema DEVE controlar acesso por papel: GERENTE tem acesso total; FUNCIONÁRIO não acessa Funcionários, Contratos, Relatórios e Configurações.
- **RF-003**: O sistema DEVE redirecionar para `/login` qualquer requisição a rota protegida sem sessão válida.
- **RF-004**: O sistema DEVE armazenar senhas com hash seguro de no mínimo 12 rounds.
- **RF-004a**: O sistema DEVE retornar a mensagem genérica "Credenciais inválidas." para qualquer falha de autenticação (senha incorreta, conta inexistente ou conta desativada com `isActive: false`), sem distinguir a causa específica.
- **RF-004b**: O endpoint de login DEVE implementar rate limiting por IP: após 10 tentativas consecutivas de login falhas originadas do mesmo endereço IP em uma janela de 15 minutos, as requisições subsequentes do mesmo IP DEVEM ser rejeitadas com HTTP 429. Nenhum bloqueio de conta é aplicado.

**Clientes e Veículos**
- **RF-005**: O sistema DEVE permitir cadastro e edição de clientes com nome, e-mail, telefone, CPF/CNPJ e endereço. A desativação (exclusão lógica) de um cliente DEVE ser bloqueada se houver ordens de serviço abertas (status AGUARDANDO ou EM_ANDAMENTO) ou contratos ativos (status AGUARDANDO_ASSINATURA) vinculados a ele; o sistema DEVE informar quais registros impedem a ação.
- **RF-006**: O sistema DEVE permitir associar múltiplos veículos a um cliente, com placa única **por tenant** (a mesma placa pode existir em tenants distintos), marca, modelo, ano e cor.
- **RF-007**: O sistema DEVE aceitar upload de fotos de veículos.

**Ordens de Serviço e Fila**
- **RF-008**: O sistema DEVE criar ordens de serviço com número sequencial (OS-XXXX), vinculadas a cliente, veículo e funcionário responsável.
- **RF-009**: O sistema DEVE suportar as transições de status: AGUARDANDO → EM_ANDAMENTO → CONCLUÍDO, com registro de horário em cada transição. Cancelamento disponível em qualquer status.
- **RF-010**: A criação de uma ordem com status AGUARDANDO DEVE inserir automaticamente uma entrada na fila com posição calculada. Ao remover uma entrada da fila (conclusão ou cancelamento da OS), as posições das demais entradas DEVEM ser recalculadas e renumeradas imediatamente em sequência, sem lacunas.
- **RF-011**: O sistema DEVE aceitar upload de fotos do serviço associadas à ordem.

**Fila Pública**
- **RF-012**: O sistema DEVE expor uma página pública acessível sem autenticação via URL configurável por slug.
- **RF-013**: A página pública DEVE exibir dois grupos distintos: (1) veículos com status EM_ANDAMENTO rotulados como "Em Atendimento" sem posição numérica, exibindo placa mascarada e status; (2) veículos com status AGUARDANDO com posição sequencial de espera (1, 2, 3…), placa mascarada e tempo estimado de atendimento. Veículos CONCLUÍDOS ou CANCELADOS não aparecem na página pública.
- **RF-014**: O tempo estimado DEVE ser calculado com base nos minutos dos serviços dos veículos à frente divididos pelo número de vagas simultâneas configuradas.
- **RF-015**: A página pública DEVE atualizar os dados automaticamente a cada 30 segundos.

**Estoque**
- **RF-016**: O sistema DEVE permitir cadastro de produtos com nome, unidade, estoque atual, estoque mínimo e preço de custo.
- **RF-017**: O sistema DEVE registrar movimentações de estoque (entrada, saída, ajuste) de forma imutável, com histórico completo.
- **RF-018**: O sistema DEVE sinalizar visualmente produtos com estoque igual ou abaixo do mínimo.
- **RF-018a**: Ao adicionar um produto com estoque igual a zero a uma ordem de serviço, o sistema DEVE permitir a operação e exibir um alerta visual de estoque zerado. Não há bloqueio — o estoque pode registrar valores negativos após a movimentação.

**Orçamentos**
- **RF-019**: O sistema DEVE criar orçamentos com número sequencial (ORC-XXXX) e suportar os status: RASCUNHO, ENVIADO, APROVADO, REJEITADO, EXPIRADO.
- **RF-019a**: A transição de RASCUNHO para ENVIADO DEVE registrar a data de envio; a aprovação DEVE registrar a data de aprovação.
- **RF-019b**: Um orçamento APROVADO DEVE oferecer a ação "Converter em Ordem de Serviço", que pré-preenche uma nova OS com o cliente, veículo e itens do orçamento (serviços e preços), exigindo confirmação do gerente antes de criar a OS. O orçamento DEVE registrar o identificador da OS gerada. Se o orçamento já possuir uma OS vinculada, a ação DEVE ser bloqueada com mensagem explicativa e exibição do número/link da OS existente — nenhuma segunda OS deve ser criada.
- **RF-020**: O sistema DEVE calcular subtotais com desconto por item e total do orçamento.
- **RF-021**: O sistema DEVE gerar PDF do orçamento com dados do cliente, itens e valores, utilizando renderização server-side HTML-to-PDF via navegador headless (Puppeteer ou Playwright). Nenhum serviço externo de geração de PDF deve ser utilizado.

**Contratos**
- **RF-022**: O sistema DEVE criar contratos com número sequencial (CTR-XXXX) e suportar os status: RASCUNHO, AGUARDANDO_ASSINATURA, ASSINADO, CANCELADO.
- **RF-023**: O sistema DEVE fornecer um link público de assinatura acessível sem autenticação.
- **RF-024**: O sistema DEVE capturar a assinatura digital via pad, armazenar a imagem da assinatura e o IP do signatário.
- **RF-025**: Após a assinatura, o sistema DEVE gerar um PDF do contrato com a assinatura incorporada, utilizando renderização server-side HTML-to-PDF via navegador headless (Puppeteer ou Playwright). Nenhum serviço externo de geração de PDF deve ser utilizado.

**Relatórios e Dashboard**
- **RF-026**: O dashboard DEVE exibir KPIs: faturamento do dia, ordens abertas, ordens concluídas no mês e produtos com estoque crítico.
- **RF-026a**: O dashboard DEVE exibir um widget de checklist de primeiros passos para tenants recém-cadastrados, contendo: (1) configurar slug da fila pública, (2) cadastrar pelo menos um tipo de serviço, (3) adicionar um funcionário. O widget DEVE ser removido automaticamente quando todas as tarefas estiverem concluídas.
- **RF-027**: O sistema DEVE oferecer relatórios filtráveis por período: faturamento, serviços mais realizados, clientes com maior volume e movimentação de estoque.

**Configurações**
- **RF-028**: O sistema DEVE permitir ao gerente configurar: nome do estabelecimento, slug da fila pública, número de vagas simultâneas, endereço, telefone e logotipo.
- **RF-029**: O sistema DEVE permitir ao gerente cadastrar, editar e desativar tipos de serviço com nome, preço base e tempo estimado em minutos.

**Upload de Arquivos**
- **RF-030**: O sistema DEVE aceitar uploads de arquivos dos tipos JPG, PNG, WEBP e PDF com tamanho máximo de 10 MB.
- **RF-031**: Os arquivos enviados DEVEM receber nomes únicos gerados pelo sistema, nunca usando o nome original do arquivo.

**Observabilidade**
- **RF-038**: O sistema DEVE expor o endpoint `GET /api/health` sem autenticação, retornando o status da conexão com o banco de dados e com o armazenamento de arquivos.
- **RF-039**: Todos os logs da aplicação DEVEM ser emitidos em formato estruturado (JSON), com campos de timestamp, nível, módulo, tenant e mensagem.
- **RF-040**: Erros não tratados DEVEM ser capturados globalmente, registrados no servidor com stack trace e retornados ao cliente apenas como mensagem genérica, sem expor detalhes internos.
- **RF-041**: O Docker Compose DEVE configurar health check no serviço da aplicação apontando para `/api/health`.

**Multi-Tenancy**
- **RF-033**: O sistema DEVE suportar múltiplos tenants (lava-jatos) na mesma instância, com isolamento total de dados: nenhum usuário pode acessar ou visualizar dados de outro tenant.
- **RF-034**: O cadastro de um novo tenant DEVE criar automaticamente a conta do proprietário como GERENTE daquele tenant.
- **RF-035**: O slug de cada tenant DEVE ser único globalmente na plataforma e utilizado tanto na URL da fila pública quanto na identificação do tenant. O slug DEVE aceitar apenas letras minúsculas, números e hífens (`[a-z0-9-]`); qualquer outro caractere DEVE ser rejeitado com mensagem de validação tanto no frontend quanto no backend. A unicidade DEVE ser garantida por constraint `UNIQUE` no banco de dados; em caso de conflito de inserção simultânea, o sistema DEVE retornar a mensagem "slug já está em uso" sem expor detalhes internos do erro de banco.
- **RF-036**: Todos os arquivos armazenados (fotos, PDFs, logos) DEVEM ser organizados de forma que cada tenant acesse apenas os seus próprios arquivos. O acesso a arquivos DEVE ser feito exclusivamente via pre-signed URLs geradas pelo servidor com validade máxima de 1 hora; os buckets do MinIO DEVEM ser configurados como privados (sem acesso público). O backend DEVE verificar a propriedade do tenant antes de gerar qualquer pre-signed URL.

**Armazenamento de Arquivos**
- **RF-037**: O armazenamento de todos os arquivos (fotos de veículos, fotos de serviços, PDFs de contratos, PDFs de orçamentos e logos) DEVE utilizar MinIO tanto no ambiente de desenvolvimento quanto no de produção. O armazenamento em sistema de arquivos local é proibido.

**Seed e Bootstrap**
- **RF-032**: O sistema DEVE incluir script de seed com dados realistas para **2 tenants distintos**: cada tenant com 1 gerente, 2 funcionários, 10 produtos, 8 tipos de serviço, 15 clientes, 20 veículos, 5 orçamentos, 3 contratos, 20 ordens de serviço e 1 configuração de lava-jato com slug de demonstração.

---

### Entidades Principais

- **Tenant (Lava-Jato)**: Representa um estabelecimento cadastrado na plataforma. Todos os demais dados pertencem a um tenant. Identificado por slug único global.
- **Usuário**: Representa gerentes e funcionários vinculados a um tenant específico. Possui papel (GERENTE/FUNCIONÁRIO) e estado ativo/inativo.
- **Cliente**: Pessoa física ou jurídica atendida pelo lava-jato. Identificada por CPF ou CNPJ. Pertence a um único tenant.
- **Veículo**: Automóvel pertencente a um cliente. Placa única dentro do tenant (dois tenants distintos podem ter o mesmo veículo cadastrado).
- **Produto**: Item de estoque utilizado nos serviços (shampoo, cera, etc.).
- **MovimentaçãoDeEstoque**: Registro imutável de entrada, saída ou ajuste de estoque de um produto.
- **TipoDeServiço**: Serviço oferecido pelo lava-jato com preço base e tempo estimado.
- **Orçamento**: Proposta comercial enviada ao cliente com itens de serviço e descontos.
- **Contrato**: Documento formal entre o lava-jato e o cliente com fluxo de assinatura digital.
- **OrdemDeServiço**: Registro do atendimento de um veículo, com itens de serviço e produtos utilizados.
- **EntradaDaFila**: Posição de uma ordem de serviço na fila de atendimento. A posição é sempre seqüencial e sem lacunas — recalculada automaticamente após qualquer entrada ou saída da fila.
- **ConfiguraçãoDoLava-Jato**: Dados operacionais do tenant (vagas simultâneas, telefone, endereço, logo). Complementa os dados do Tenant.
- **ArquivoUpload**: Metadados de um arquivo enviado ao sistema (foto de veículo, de serviço, logo ou PDF). Vinculado a um tenant.

---

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **SC-001**: Um novo funcionário consegue criar uma ordem de serviço completa em menos de 3 minutos.
- **SC-002**: Um cliente externo consegue visualizar a posição do seu veículo na fila pública sem criar conta e sem necessidade de suporte.
- **SC-003**: O ambiente de produção sobe completamente com um único comando (`docker compose up -d`) e está operacional em menos de 5 minutos.
- **SC-004**: 100% das páginas do dashboard são acessíveis e funcionais com os dados do seed após a execução de `prisma db seed`.
- **SC-005**: A fila pública exibe dados atualizados em no máximo 30 segundos após uma mudança de status.
- **SC-006**: Nenhuma informação sensível (senha, assinatura, IP) é exposta em respostas de API ou logs do sistema.
- **SC-007**: O PDF de orçamentos e contratos é gerado em menos de 5 segundos para documentos de até 20 itens.
- **SC-008**: A plataforma suporta pelo menos 5 usuários simultâneos sem degradação perceptível de desempenho.
- **SC-009**: Todos os alertas de estoque crítico são exibidos imediatamente após o cadastro ou atualização do produto sem necessidade de recarregar a página.
- **SC-010**: O implementador entrega o README com justificativa das 2–3 features extras escolhidas.

- **SC-011**: O endpoint `/api/health` responde em menos de 2 segundos e retorna HTTP 200 quando todos os servíos dependentes (banco de dados e armazenamento) estão saudáveis.
- **SC-012**: Em caso de falha de um serviço dependente (banco ou MinIO), o endpoint `/api/health` retorna HTTP 503 com indicação do componente afetado em menos de 5 segundos.
- **SC-013**: Nenhuma resposta de API em produção contém stack trace ou mensagem de erro interno do servidor.

---

## Premissas

- O sistema é **multi-tenant**: múltiplos lava-jatos podem coexistir na mesma instância com isolamento total de dados entre eles.
- O acesso mobile é suportado por design responsivo; não há aplicativo nativo na v1.
- A integração com sistemas externos (pagamento, WhatsApp, e-mail) é opcional e depende das features extras escolhidas pelo implementador.
- O implementador escolhe o nome do produto e o documenta no README antes de iniciar a implementação.
- O armazenamento de arquivos (fotos, PDFs, logos) utiliza **MinIO via Docker Compose em todos os ambientes** (desenvolvimento e produção). Não há modo de armazenamento local em sistema de arquivos.
- A autenticação é baseada em e-mail e senha; não há login social (OAuth2 de terceiros) na v1.
- Backup e recuperação de banco de dados são responsabilidade da infraestrutura do operador, não do aplicativo.
- O sistema assume conexão estável com o banco de dados; não há modo offline.
- Os dados do seed usam nomes e CPFs fictícios em conformidade com práticas de privacidade.
