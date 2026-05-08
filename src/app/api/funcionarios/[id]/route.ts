import { NextRequest } from 'next/server'
import { employeeUpdateSchema } from '@/lib/validations/user'
import {
  getEmployeeById,
  updateEmployee,
  deactivateEmployee,
} from '@/server/services/user.service'
import { assertTenantOwnership } from '@/server/policies/rbac'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const employee = await getEmployeeById(id, tenantId)
    return ok(employee)
  })()
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    // Verify ownership before update
    const existing = await prisma.user.findFirst({ where: { id }, select: { tenantId: true } })
    if (existing) {
      assertTenantOwnership(existing.tenantId, { userId: req.headers.get('x-user-id')!, tenantId, role: req.headers.get('x-user-role')! })
    }

    const parsed = employeeUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const employee = await updateEmployee(id, tenantId, parsed.data)
    return ok(employee)
  })()
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { id } = await params
    const tenantId = req.headers.get('x-tenant-id')!

    const employee = await deactivateEmployee(id, tenantId)
    return ok(employee)
  })()
}
