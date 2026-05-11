import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logTenantCreated } from '@/lib/logging/logger'
import { UnprocessableError } from '@/lib/api-error'
import type { TenantRegistrationInput } from '@/lib/validations/tenant'

export async function createTenant(input: TenantRegistrationInput) {
  const passwordHash = await bcrypt.hash(input.password, 12)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          businessName: input.businessName,
          slug: input.slug,
        },
      })

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: input.ownerName,
          email: input.email,
          passwordHash,
          role: 'GERENTE',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          tenantId: true,
          createdAt: true,
        },
      })

      return { tenant, user }
    })

    logTenantCreated(result.tenant.id, result.tenant.slug)

    return result
  } catch (error) {
    // Prisma unique constraint violation code
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === 'P2002') {
      const target = prismaError.meta?.target ?? []
      if (target.includes('slug')) {
        throw new UnprocessableError('slug já está em uso')
      }
      if (target.includes('email')) {
        throw new UnprocessableError('E-mail já está em uso')
      }
    }
    throw error
  }
}
