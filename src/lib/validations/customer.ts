import { z } from 'zod'
import { brazilianPhoneSchema, cpfCnpjSchema } from './common'

export const customerCreateSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email().optional(),
  phone: brazilianPhoneSchema.optional(),
  whatsappPhone: brazilianPhoneSchema.optional(),
  cpfCnpj: cpfCnpjSchema.optional(),
  address: z.string().max(255).optional(),
})

export const customerUpdateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  email: z.string().email().optional().nullable(),
  phone: brazilianPhoneSchema.optional().nullable(),
  whatsappPhone: brazilianPhoneSchema.optional().nullable(),
  cpfCnpj: cpfCnpjSchema.optional().nullable(),
  address: z.string().max(255).optional().nullable(),
})

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>
