import { z } from 'zod'
import { slugSchema } from './common'

export const tenantRegistrationSchema = z.object({
  businessName: z.string().min(2).max(100),
  slug: slugSchema,
  ownerName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
})

export type TenantRegistrationInput = z.infer<typeof tenantRegistrationSchema>
