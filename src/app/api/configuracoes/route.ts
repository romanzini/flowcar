import { NextRequest } from 'next/server'
import { carWashConfigUpdateSchema } from '@/lib/validations/settings'
import { getConfig, upsertConfig, uploadLogo } from '@/server/services/settings.service'
import { ForbiddenError, UnprocessableError, withErrorHandler } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    if (req.headers.get('x-user-role') !== 'GERENTE') {
      throw new ForbiddenError('Acesso restrito a gerentes')
    }

    const tenantId = req.headers.get('x-tenant-id')!
    const config = await getConfig(tenantId)
    return ok(config)
  })()
}

export async function PATCH(req: NextRequest) {
  return withErrorHandler(async () => {
    if (req.headers.get('x-user-role') !== 'GERENTE') {
      throw new ForbiddenError('Acesso restrito a gerentes')
    }

    const tenantId = req.headers.get('x-tenant-id')!
    const contentType = req.headers.get('content-type') ?? ''

    // Logo upload via multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const userId = req.headers.get('x-user-id') ?? undefined
      const formData = await req.formData()
      const file = formData.get('logo') as File | null

      if (!file) {
        throw new UnprocessableError('Campo "logo" é obrigatório no multipart upload')
      }

      const fileUpload = await uploadLogo(tenantId, userId, file)
      return ok(fileUpload as unknown as Record<string, unknown>)
    }

    // JSON PATCH for config fields
    const body = await req.json()
    const parsed = carWashConfigUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const config = await upsertConfig(tenantId, parsed.data)
    return ok(config as unknown as Record<string, unknown>)
  })()
}
