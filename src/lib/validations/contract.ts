import { z } from 'zod'

const signatureDataUrlPattern = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/

export const contractCreateSchema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório').max(150, 'Título muito longo'),
  contentHtml: z.string().min(1, 'Conteúdo é obrigatório'),
})

export const contractUpdateSchema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório').optional(),
  title: z.string().min(1, 'Título é obrigatório').max(150, 'Título muito longo').optional(),
  contentHtml: z.string().min(1, 'Conteúdo é obrigatório').optional(),
})

export const signatureSubmitSchema = z.object({
  signatureDataUrl: z.string().regex(signatureDataUrlPattern, 'Assinatura em PNG base64 inválida'),
})

export const linkRegenerationSchema = z.object({})

export type ContractCreateInput = z.infer<typeof contractCreateSchema>
export type ContractUpdateInput = z.infer<typeof contractUpdateSchema>
export type SignatureSubmitInput = z.infer<typeof signatureSubmitSchema>
