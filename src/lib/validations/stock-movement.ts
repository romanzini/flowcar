import { z } from 'zod'

export const stockMovementCreateSchema = z.object({
  type: z.enum(['ENTRADA', 'SAIDA', 'AJUSTE']),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  reason: z.string().max(255).optional(),
  serviceOrderId: z.string().optional(),
  unitCost: z.coerce.number().min(0).optional(),
})

export type StockMovementCreateInput = z.infer<typeof stockMovementCreateSchema>
