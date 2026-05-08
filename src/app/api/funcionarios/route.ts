import { NextRequest } from 'next/server'
import { employeeCreateSchema } from '@/lib/validations/user'
import { listEmployees, createEmployee } from '@/server/services/user.service'
import { withErrorHandler, UnprocessableError } from '@/lib/api-error'
import { ok } from '@/lib/utils'

export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!

    const employees = await listEmployees(tenantId)
    return ok(employees)
  })()
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  return withErrorHandler(async () => {
    const tenantId = req.headers.get('x-tenant-id')!

    const parsed = employeeCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw new UnprocessableError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    }

    const employee = await createEmployee(tenantId, parsed.data)
    return ok(employee, 201)
  })()
}
