import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!

    const serviceTypes = await prisma.serviceType.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        basePrice: true,
        estimatedMinutes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    })

    return ok(serviceTypes)
  })()
}
