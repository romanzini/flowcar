import { z } from 'zod'

export const quoteItemSchema = z.object({
  serviceTypeId: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  quantity: z.number().positive('Quantidade deve ser maior que zero'),
  unitPrice: z.number().min(0, 'Preço unitário não pode ser negativo'),
  discountAmount: z.number().min(0).optional().default(0),
})

export const quoteCreateSchema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  vehicleId: z.string().optional(),
  validUntil: z.string().min(1, 'Data de validade é obrigatória'),
  items: z.array(quoteItemSchema).min(1, 'Pelo menos um item é obrigatório'),
})

export const quoteUpdateSchema = z.object({
  vehicleId: z.string().optional().nullable(),
  validUntil: z.string().optional(),
  items: z.array(quoteItemSchema).optional(),
})

export const quoteStatusTransitionSchema = z.object({
  status: z.enum(['ENVIADO', 'APROVADO', 'REJEITADO'], {
    error: 'Status inválido para transição',
  }),
})

export type QuoteItemInput = z.infer<typeof quoteItemSchema>
export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>
export type QuoteStatusTransitionInput = z.infer<typeof quoteStatusTransitionSchema>
