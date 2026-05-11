import { z } from 'zod'

export const batchOSSchema = z.object({
  ids: z
    .array(z.string().cuid())
    .min(1, 'Selecione ao menos uma OS')
    .max(200, 'Máximo de 200 registros por operação em lote'),
  action: z.enum(['update_status', 'assign_user']),
  payload: z.record(z.string(), z.unknown()),
})

export type BatchOSInput = z.infer<typeof batchOSSchema>
