import { z } from 'zod'
import { brazilianPhoneSchema } from './common'

export const employeeCreateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(['GERENTE', 'FUNCIONARIO']),
  phone: brazilianPhoneSchema.optional(),
})

export const employeeUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(72).optional(),
  role: z.enum(['GERENTE', 'FUNCIONARIO']).optional(),
  phone: brazilianPhoneSchema.optional().nullable(),
})

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>
