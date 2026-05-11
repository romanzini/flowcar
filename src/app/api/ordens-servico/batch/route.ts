import { NextRequest } from 'next/server'
import { withErrorHandler, ForbiddenError, UnprocessableError, NotFoundError } from '@/lib/api-error'
import { ok } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { batchOSSchema } from '@/lib/validations/batch'

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!
    const userRole = req.headers.get('x-user-role')

    if (userRole !== 'GERENTE') {
      throw new ForbiddenError('Apenas gerentes podem executar ações em lote')
    }

    const body = await req.json()
    const parsed = batchOSSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const { ids, action, payload } = parsed.data

    // Verify all IDs belong to this tenant
    const orders = await prisma.serviceOrder.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true },
    })

    if (orders.length !== ids.length) {
      throw new NotFoundError('Uma ou mais ordens não foram encontradas')
    }

    let affected = 0

    if (action === 'update_status') {
      const newStatus = (payload as { status?: string }).status
      const validStatuses = ['AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']
      if (!newStatus || !validStatuses.includes(newStatus)) {
        throw new UnprocessableError('Status inválido. Use: ' + validStatuses.join(', '))
      }

      const result = await prisma.serviceOrder.updateMany({
        where: { id: { in: ids }, tenantId },
        data: { status: newStatus as never },
      })
      affected = result.count
    } else if (action === 'assign_user') {
      const userId = (payload as { userId?: string }).userId
      if (!userId) {
        throw new UnprocessableError('userId é obrigatório para assign_user')
      }

      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId, isActive: true },
        select: { id: true },
      })
      if (!user) throw new NotFoundError('Funcionário não encontrado')

      const result = await prisma.serviceOrder.updateMany({
        where: { id: { in: ids }, tenantId },
        data: { responsibleUserId: userId },
      })
      affected = result.count
    }

    return ok({ affected })
  })()
}
