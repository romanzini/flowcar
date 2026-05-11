import { z } from 'zod'

export const batchOSSchema = z.object({
  ids: z.array(z.string().cuid()).refine((arr) => arr.length >= 1, {
    message: 'Selecione ao menos uma OS',
  }),
  action: z.enum(['update_status', 'assign_user']),
  payload: z.record(z.string(), z.unknown()),
})

export type BatchOSInput = z.infer<typeof batchOSSchema>
