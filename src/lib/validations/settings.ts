import { z } from 'zod'

// ─── CarWashConfig schemas ────────────────────────────────────────────────────

export const carWashConfigUpdateSchema = z.object({
  businessName: z.string().min(2).max(150).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens')
    .min(2)
    .max(60)
    .optional(),
  simultaneousSlots: z.coerce.number().int().min(1).optional(),
  phone: z.string().min(8).max(20).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  logoFileId: z.string().cuid().optional().nullable(),
})

export type CarWashConfigUpdateInput = z.infer<typeof carWashConfigUpdateSchema>

// ─── ServiceType schemas ──────────────────────────────────────────────────────

export const serviceTypeCreateSchema = z.object({
  name: z.string().min(2).max(100),
  basePrice: z.coerce.number().min(0),
  estimatedMinutes: z.coerce.number().int().min(1),
})

export const serviceTypeUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  basePrice: z.coerce.number().min(0).optional(),
  estimatedMinutes: z.coerce.number().int().min(1).optional(),
})

export type ServiceTypeCreateInput = z.infer<typeof serviceTypeCreateSchema>
export type ServiceTypeUpdateInput = z.infer<typeof serviceTypeUpdateSchema>
