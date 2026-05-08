# Modelo de Dados

## Visão geral

- O PostgreSQL será o repositório principal de dados transacionais.
- O Redis armazenará sessões de refresh token, janelas de rate limiting e filas BullMQ.
- O MinIO armazenará objetos privados com prefixo obrigatório por tenant.
- O modelo é **shared-schema multi-tenant**: toda entidade de negócio pertence a um `tenantId`, com exceção do próprio `Tenant`.

## Relações centrais

- `Tenant` possui `User`, `Customer`, `Vehicle`, `Product`, `ServiceType`, `Quote`, `Contract`, `ServiceOrder`, `FileUpload`, `WhatsAppNotification` e uma `CarWashConfig`.
- `Customer` possui múltiplos `Vehicle`, `Quote`, `Contract` e `ServiceOrder`.
- `Vehicle` pertence a um `Customer` e pode ter várias `ServiceOrder` ao longo do tempo, mas no máximo uma ordem ativa por vez.
- `ServiceOrder` possui múltiplos `ServiceOrderItem`, uma `QueueEntry` ativa opcional e múltiplos `FileUpload` de categoria foto.
- `Quote` possui múltiplos `QuoteItem` e pode gerar no máximo uma `ServiceOrder`.
- `Contract` pode possuir uma única `ContractSignature` e um PDF final vinculado por `FileUpload`.

## Enums de domínio

- `UserRole`: `GERENTE`, `FUNCIONARIO`
- `ServiceOrderStatus`: `AGUARDANDO`, `EM_ANDAMENTO`, `CONCLUIDO`, `CANCELADO`
- `QueueStatus`: `AGUARDANDO`, `EM_ANDAMENTO`
- `QuoteStatus`: `RASCUNHO`, `ENVIADO`, `APROVADO`, `REJEITADO`, `EXPIRADO`
- `ContractStatus`: `RASCUNHO`, `AGUARDANDO_ASSINATURA`, `ASSINADO`, `CANCELADO`
- `StockMovementType`: `ENTRADA`, `SAIDA`, `AJUSTE`
- `FileCategory`: `FOTO_VEICULO`, `FOTO_SERVICO`, `PDF_ORCAMENTO`, `PDF_CONTRATO`, `LOGOTIPO`, `ASSINATURA_CONTRATO`
- `NotificationStatus`: `PENDENTE`, `ENVIANDO`, `ENVIADA`, `FALHA`
- `NotificationEvent`: `FILA_ATUALIZADA`, `OS_CONCLUIDA`, `OS_CANCELADA`

## Entidades

### Tenant

- **Campos**: `id`, `businessName`, `slug`, `createdAt`, `updatedAt`.
- **Relações**: 1:N com todas as entidades de negócio; 1:1 com `CarWashConfig`.
- **Regras**: `slug` é globalmente único, minúsculo e validado por regex `[a-z0-9-]`; a URL pública da fila deriva deste campo.

### User

- **Campos**: `id`, `tenantId`, `name`, `email`, `passwordHash`, `role`, `phone`, `isActive`, `lastLoginAt`, `createdAt`, `updatedAt`.
- **Relações**: pertence a um `Tenant`; pode ser responsável por `ServiceOrder` e autor de `StockMovement`.
- **Regras**: `email` é globalmente único para evitar ambiguidade no login; senhas usam bcrypt com 12 rounds; desativação revoga sessões em Redis imediatamente.

### CarWashConfig

- **Campos**: `id`, `tenantId`, `simultaneousSlots`, `phone`, `address`, `logoFileId`, `createdAt`, `updatedAt`.
- **Relações**: pertence a um `Tenant`; `logoFileId` referencia `FileUpload` opcional.
- **Regras**: `tenantId` é único; `simultaneousSlots` deve ser >= 1; o logo deve pertencer ao mesmo tenant.

### Customer

- **Campos**: `id`, `tenantId`, `name`, `email`, `phone`, `whatsappPhone`, `cpfCnpj`, `address`, `isActive`, `createdAt`, `updatedAt`.
- **Relações**: pertence a um `Tenant`; possui muitos `Vehicle`, `Quote`, `Contract` e `ServiceOrder`.
- **Regras**: `whatsappPhone` é opcional; `cpfCnpj` quando informado deve ser válido e único por tenant; desativação é bloqueada se houver OS ativa ou contrato em assinatura.

### Vehicle

- **Campos**: `id`, `tenantId`, `customerId`, `plate`, `brand`, `model`, `year`, `color`, `isActive`, `createdAt`, `updatedAt`.
- **Relações**: pertence a `Customer` e `Tenant`; participa de várias `ServiceOrder`.
- **Regras**: unicidade composta `(tenantId, plate)`; `plate` é normalizada para maiúsculas; não pode ser desativado com OS ativa vinculada.

### ServiceType

- **Campos**: `id`, `tenantId`, `name`, `basePrice`, `estimatedMinutes`, `isActive`, `createdAt`, `updatedAt`.
- **Relações**: pertence a `Tenant`; pode aparecer em `QuoteItem` e `ServiceOrderItem`.
- **Regras**: `estimatedMinutes` > 0; `basePrice` >= 0; tipos inativos não entram em novos orçamentos/OS.

### Product

- **Campos**: `id`, `tenantId`, `name`, `unit`, `currentStock`, `minimumStock`, `costPrice`, `isActive`, `createdAt`, `updatedAt`.
- **Relações**: pertence a `Tenant`; possui muitos `StockMovement` e pode ser referenciado em `ServiceOrderItem`.
- **Regras**: `costPrice` >= 0; `minimumStock` >= 0; `currentStock` pode ficar negativo após consumo em OS; alertas visuais são derivados da comparação `currentStock <= minimumStock`.

### StockMovement

- **Campos**: `id`, `tenantId`, `productId`, `userId`, `serviceOrderId`, `type`, `quantity`, `unitCost`, `reason`, `createdAt`.
- **Relações**: pertence a `Tenant`; referencia `Product`, `User` e opcionalmente `ServiceOrder`.
- **Regras**: entidade imutável; `quantity` sempre positiva; o sentido da operação é determinado por `type`; ajustes preservam histórico completo.

### Quote

- **Campos**: `id`, `tenantId`, `customerId`, `vehicleId`, `number`, `status`, `validUntil`, `sentAt`, `approvedAt`, `rejectedAt`, `expiredAt`, `totalAmount`, `convertedOrderId`, `pdfFileId`, `createdAt`, `updatedAt`.
- **Relações**: pertence a `Tenant`; possui muitos `QuoteItem`; referencia `Customer`, `Vehicle`, `FileUpload` e opcionalmente a OS gerada.
- **Regras**: unicidade composta `(tenantId, number)`; `validUntil` é obrigatório; apenas um `convertedOrderId` é permitido; job diário move itens vencidos para `EXPIRADO`.

### QuoteItem

- **Campos**: `id`, `quoteId`, `serviceTypeId`, `description`, `quantity`, `unitPrice`, `discountAmount`, `subtotal`, `createdAt`.
- **Relações**: pertence a `Quote`; referencia `ServiceType` opcional para manter histórico mesmo após desativação do tipo.
- **Regras**: `quantity` > 0; `unitPrice` >= 0; `discountAmount` >= 0 e não pode exceder o subtotal bruto.

### Contract

- **Campos**: `id`, `tenantId`, `customerId`, `number`, `title`, `contentHtml`, `status`, `publicTokenHash`, `publicLinkExpiresAt`, `signedAt`, `pdfFileId`, `createdAt`, `updatedAt`.
- **Relações**: pertence a `Tenant`; referencia `Customer`, `FileUpload` e possui uma `ContractSignature` opcional.
- **Regras**: unicidade composta `(tenantId, number)`; o token público é armazenado apenas como hash; links valem 7 dias; contrato assinado não pode reabrir fluxo de assinatura.

### ContractSignature

- **Campos**: `id`, `contractId`, `signatureFileId`, `signedIp`, `signedUserAgent`, `signedAt`, `createdAt`.
- **Relações**: 1:1 com `Contract`; `signatureFileId` aponta para `FileUpload` da categoria `ASSINATURA_CONTRATO`.
- **Regras**: criada uma única vez por contrato; `signedIp` é armazenado mas nunca exposto em respostas públicas ou logs.

### ServiceOrder

- **Campos**: `id`, `tenantId`, `customerId`, `vehicleId`, `responsibleUserId`, `number`, `status`, `subtotalAmount`, `discountAmount`, `totalAmount`, `startedAt`, `completedAt`, `cancelledAt`, `sourceQuoteId`, `createdAt`, `updatedAt`.
- **Relações**: pertence a `Tenant`; possui muitos `ServiceOrderItem`; referencia `Customer`, `Vehicle`, `User` e opcionalmente `Quote`; possui `QueueEntry` ativa opcional.
- **Regras**: unicidade composta `(tenantId, number)`; existe no máximo uma OS ativa (`AGUARDANDO` ou `EM_ANDAMENTO`) por veículo e tenant; conclusão/cancelamento recalcula a fila e pode disparar notificação WhatsApp.

### ServiceOrderItem

- **Campos**: `id`, `serviceOrderId`, `serviceTypeId`, `productId`, `kind`, `description`, `quantity`, `unitPrice`, `discountAmount`, `subtotal`, `createdAt`.
- **Relações**: pertence a `ServiceOrder`; referencia opcionalmente `ServiceType` e `Product`.
- **Regras**: `kind` distingue item de serviço e item de produto; pelo menos um entre `serviceTypeId` e `productId` deve existir conforme o `kind`; `quantity` > 0.

### QueueEntry

- **Campos**: `id`, `tenantId`, `serviceOrderId`, `status`, `position`, `estimatedMinutes`, `enteredAt`, `startedAt`, `updatedAt`.
- **Relações**: pertence a `Tenant`; referencia `ServiceOrder`.
- **Regras**: `serviceOrderId` é único; itens `AGUARDANDO` recebem posições densas sequenciais; itens `EM_ANDAMENTO` ficam com `position = null` e rótulo derivado "Em Atendimento"; a entrada é removida quando a OS conclui ou cancela.

### FileUpload

- **Campos**: `id`, `tenantId`, `category`, `bucket`, `objectKey`, `mimeType`, `sizeBytes`, `checksum`, `uploadedByUserId`, `createdAt`.
- **Relações**: pertence a `Tenant`; pode ser associado a `CarWashConfig`, `Contract`, `ContractSignature`, `Quote` ou `ServiceOrder`.
- **Regras**: `objectKey` segue obrigatoriamente o padrão `{tenantId}/{tipo}/{uuid}.{ext}`; apenas objetos privados; tipos permitidos JPG, PNG, WEBP e PDF; tamanho máximo 10 MB.

### WhatsAppNotification

- **Campos**: `id`, `tenantId`, `customerId`, `serviceOrderId`, `event`, `targetPhone`, `payloadJson`, `status`, `providerMessageId`, `attempts`, `lastError`, `sentAt`, `createdAt`, `updatedAt`.
- **Relações**: pertence a `Tenant`; referencia `Customer` e opcionalmente `ServiceOrder`.
- **Regras**: só é criada quando `Customer.whatsappPhone` está preenchido; retries com backoff controlado pelo BullMQ; falhas ficam auditáveis sem bloquear o fluxo principal da OS.

## Artefatos auxiliares fora do PostgreSQL

### Redis

- **Sessão de refresh**: chave `auth:refresh:{tokenId}` com `userId`, `tenantId`, `expiresAt` e metadados de sessão.
- **Revogação por usuário**: conjunto `auth:user:{userId}:tokens` para invalidação em logout e desativação de conta.
- **Rate limiting**: janela deslizante por IP em `auth:login:attempts:{ip}`.
- **Filas BullMQ**: namespaces `bull:whatsapp-notifications:*` e `bull:quote-expiration:*`.

### MinIO

- **Bucket**: único bucket privado da aplicação.
- **Chave de objeto**: `{tenantId}/{categoria}/{uuid}.{ext}`.
- **Acesso**: geração de pre-signed URL somente após validação de pertencimento do tenant.

### Estado derivado sem tabela dedicada

- **Checklist de onboarding**: calculado a partir de três fatos do tenant: existência de slug válido, ao menos um `ServiceType` ativo e ao menos um `User` com papel `FUNCIONARIO`.
- **Posição pública da fila**: derivada de `QueueEntry.status`, `QueueEntry.position`, `ServiceOrder.status` e `CarWashConfig.simultaneousSlots`.

## Transições de estado

### Ordem de Serviço

- `AGUARDANDO -> EM_ANDAMENTO`: registra `startedAt`, retira posição numérica pública e marca a entrada de fila como `EM_ANDAMENTO`.
- `EM_ANDAMENTO -> CONCLUIDO`: registra `completedAt`, remove a entrada de fila e recalcula posições restantes.
- `AGUARDANDO -> CANCELADO` ou `EM_ANDAMENTO -> CANCELADO`: registra `cancelledAt`, remove a entrada de fila e recalcula posições restantes.

### Orçamento

- `RASCUNHO -> ENVIADO`: registra `sentAt`.
- `ENVIADO -> APROVADO`: registra `approvedAt`.
- `RASCUNHO` ou `ENVIADO` -> `REJEITADO`: registra `rejectedAt`.
- `RASCUNHO` ou `ENVIADO` -> `EXPIRADO`: executado por job diário quando `validUntil` vencer.
- `APROVADO -> ServiceOrder`: gera no máximo uma OS e preenche `convertedOrderId`.

### Contrato

- `RASCUNHO -> AGUARDANDO_ASSINATURA`: gera token público e `publicLinkExpiresAt`.
- `AGUARDANDO_ASSINATURA -> ASSINADO`: persiste `ContractSignature`, gera PDF final e invalida o token.
- `RASCUNHO` ou `AGUARDANDO_ASSINATURA -> CANCELADO`: encerra o fluxo sem assinatura.
- Link expirado não muda o status sozinho; apenas bloqueia nova assinatura até regeneração do link.

### Notificação WhatsApp

- `PENDENTE -> ENVIANDO -> ENVIADA`: envio concluído com `providerMessageId` e `sentAt`.
- `PENDENTE/ENVIANDO -> FALHA`: registra erro e permite nova tentativa até o limite configurado pelo worker.
