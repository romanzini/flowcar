import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { revokeAllUserTokens } from '@/lib/auth/redis'
import { NotFoundError, UnprocessableError } from '@/lib/api-error'
import type { EmployeeCreateInput, EmployeeUpdateInput } from '@/lib/validations/user'

export async function listEmployees(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { name: 'asc' },
  })
}

export async function getEmployeeById(id: string, tenantId: string) {
  const user = await prisma.user.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) throw new NotFoundError()
  return user
}

export async function createEmployee(tenantId: string, input: EmployeeCreateInput) {
  const passwordHash = await bcrypt.hash(input.password, 12)

  try {
    return await prisma.user.create({
      data: {
        tenantId,
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        phone: input.phone ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  } catch (error) {
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2002') {
      throw new UnprocessableError('E-mail já está em uso')
    }
    throw error
  }
}

export async function updateEmployee(
  id: string,
  tenantId: string,
  input: EmployeeUpdateInput
) {
  const existing = await prisma.user.findFirst({ where: { id, tenantId } })
  if (!existing) throw new NotFoundError()

  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.email !== undefined) data.email = input.email
  if (input.role !== undefined) data.role = input.role
  if (input.phone !== undefined) data.phone = input.phone
  if (input.password !== undefined) {
    data.passwordHash = await bcrypt.hash(input.password, 12)
  }

  try {
    return await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  } catch (error) {
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2002') {
      throw new UnprocessableError('E-mail já está em uso')
    }
    throw error
  }
}

export async function deactivateEmployee(id: string, tenantId: string) {
  const existing = await prisma.user.findFirst({ where: { id, tenantId } })
  if (!existing) throw new NotFoundError()

  // Revoke all active refresh tokens immediately
  await revokeAllUserTokens(id)

  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      updatedAt: true,
    },
  })
}
