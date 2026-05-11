import { z } from 'zod'

export const slugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')

export const brazilianPhoneSchema = z
  .string()
  .regex(/^\+?55\d{10,11}$|^\d{10,11}$/, 'Invalid Brazilian phone number')

export const cpfCnpjSchema = z
  .string()
  .regex(/^\d{11}$|^\d{14}$/, 'CPF must have 11 digits or CNPJ must have 14 digits')

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const fileUploadMetaSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  sizeBytes: z.number().int().min(1).max(10 * 1024 * 1024),
})
