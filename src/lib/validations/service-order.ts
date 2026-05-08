import { z } from 'zod'

export const osCreateSchema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  vehicleId: z.string().min(1, 'Veículo é obrigatório'),
  responsibleUserId: z.string().optional(),
  sourceQuoteId: z.string().optional(),
})

export const osUpdateSchema = z.object({
  responsibleUserId: z.string().nullable().optional(),
})

export const statusTransitionSchema = z.object({
  status: z.enum(['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'], {
    error: 'Status inválido para transição',
  }),
})

export const osItemSchema = z.object({
  kind: z.enum(['SERVICO', 'PRODUTO']),
  serviceTypeId: z.string().optional(),
  productId: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  quantity: z.number().positive('Quantidade deve ser maior que zero'),
  unitPrice: z.number().min(0, 'Preço unitário não pode ser negativo'),
  discountAmount: z.number().min(0).optional().default(0),
}).refine(
  (data) => {
    if (data.kind === 'SERVICO' && !data.serviceTypeId) return false
    if (data.kind === 'PRODUTO' && !data.productId) return false
    return true
  },
  { message: 'Serviço requer serviceTypeId; produto requer productId' }
)

export type OSCreateInput = z.infer<typeof osCreateSchema>
export type OSUpdateInput = z.infer<typeof osUpdateSchema>
export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>
export type OSItemInput = z.infer<typeof osItemSchema>
