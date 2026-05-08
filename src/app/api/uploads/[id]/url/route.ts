import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPresignedUrl } from '@/lib/storage/upload'
import { withErrorHandler, NotFoundError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const file = await prisma.fileUpload.findFirst({
      where: { id, tenantId },
      select: { objectKey: true },
    })

    if (!file) throw new NotFoundError('Arquivo não encontrado')

    const url = await getPresignedUrl(file.objectKey)
    return ok({ url })
  })()
}
