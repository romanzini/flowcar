import { z } from 'zod'

export const loginRequestSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const refreshRequestSchema = z.object({
  refreshToken: z.string().optional(),
})

export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    tenantId: z.string(),
  }),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>
export type TokenResponse = z.infer<typeof tokenResponseSchema>
