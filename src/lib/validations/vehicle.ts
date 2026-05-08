import { z } from 'zod'

const plateRegex = /^[A-Z]{3}\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/

export const vehicleCreateSchema = z.object({
  plate: z
    .string()
    .min(7)
    .max(8)
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .pipe(z.string().regex(plateRegex, 'Placa inválida (formato ABC-1234 ou Mercosul)')),
  brand: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().max(30).optional(),
  customerId: z.string().cuid(),
})

export const vehicleUpdateSchema = z.object({
  plate: z
    .string()
    .min(7)
    .max(8)
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .pipe(z.string().regex(plateRegex, 'Placa inválida (formato ABC-1234 ou Mercosul)'))
    .optional(),
  brand: z.string().max(50).optional().nullable(),
  model: z.string().max(50).optional().nullable(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  color: z.string().max(30).optional().nullable(),
})

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>
