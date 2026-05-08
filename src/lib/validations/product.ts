import { z } from 'zod'

export const productCreateSchema = z.object({
  name: z.string().min(2).max(150),
  unit: z.string().min(1).max(20),
  currentStock: z.coerce.number().default(0),
  minimumStock: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).default(0),
})

export const productUpdateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  unit: z.string().min(1).max(20).optional(),
  minimumStock: z.coerce.number().min(0).optional(),
  costPrice: z.coerce.number().min(0).optional(),
})

export type ProductCreateInput = z.infer<typeof productCreateSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
