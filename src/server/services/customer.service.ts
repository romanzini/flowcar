import { prisma } from '@/lib/prisma'
import { NotFoundError, UnprocessableError } from '@/lib/api-error'
import type { CustomerCreateInput, CustomerUpdateInput } from '@/lib/validations/customer'

function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11) {
    // CPF: ***.456.789-**
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
  } else if (digits.length === 14) {
    // CNPJ: **.345.678/0001-**
    return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-**`
  }
  return value
}

const customerSelect = {
  id: true,
  tenantId: true,
  name: true,
  email: true,
  phone: true,
  whatsappPhone: true,
  cpfCnpj: true,
  address: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}

export async function listCustomers(tenantId: string, search?: string) {
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { whatsappPhone: { contains: search } },
            ],
          }
        : {}),
    },
    select: customerSelect,
    orderBy: { name: 'asc' },
  })

  return customers.map((c) => ({
    ...c,
    cpfCnpj: c.cpfCnpj ? maskCpfCnpj(c.cpfCnpj) : null,
  }))
}

export async function getCustomerById(id: string, tenantId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId },
    select: customerSelect,
  })

  if (!customer) throw new NotFoundError()
  // getById returns the full unmasked cpfCnpj
  return customer
}

export async function createCustomer(tenantId: string, input: CustomerCreateInput) {
  try {
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        whatsappPhone: input.whatsappPhone ?? null,
        cpfCnpj: input.cpfCnpj ?? null,
        address: input.address ?? null,
      },
      select: customerSelect,
    })

    return {
      ...customer,
      cpfCnpj: customer.cpfCnpj ? maskCpfCnpj(customer.cpfCnpj) : null,
    }
  } catch (error) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === 'P2002') {
      throw new UnprocessableError('CPF/CNPJ já cadastrado para este tenant')
    }
    throw error
  }
}

export async function updateCustomer(
  id: string,
  tenantId: string,
  input: CustomerUpdateInput
) {
  const existing = await prisma.customer.findFirst({ where: { id, tenantId } })
  if (!existing) throw new NotFoundError()

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.whatsappPhone !== undefined && { whatsappPhone: input.whatsappPhone }),
        ...(input.cpfCnpj !== undefined && { cpfCnpj: input.cpfCnpj }),
        ...(input.address !== undefined && { address: input.address }),
      },
      select: customerSelect,
    })

    return {
      ...customer,
      cpfCnpj: customer.cpfCnpj ? maskCpfCnpj(customer.cpfCnpj) : null,
    }
  } catch (error) {
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2002') {
      throw new UnprocessableError('CPF/CNPJ já cadastrado para este tenant')
    }
    throw error
  }
}

export async function deactivateCustomer(id: string, tenantId: string) {
  const existing = await prisma.customer.findFirst({ where: { id, tenantId } })
  if (!existing) throw new NotFoundError()

  // Block deactivation if active OS (AGUARDANDO/EM_ANDAMENTO) exist
  const activeOrders = await prisma.serviceOrder.findMany({
    where: {
      customerId: id,
      tenantId,
      status: { in: ['AGUARDANDO', 'EM_ANDAMENTO'] },
    },
    select: { id: true, number: true },
  })

  // Block deactivation if contracts in AGUARDANDO_ASSINATURA exist
  const pendingContracts = await prisma.contract.findMany({
    where: {
      customerId: id,
      tenantId,
      status: 'AGUARDANDO_ASSINATURA',
    },
    select: { id: true, number: true },
  })

  if (activeOrders.length > 0 || pendingContracts.length > 0) {
    const messages: string[] = []
    if (activeOrders.length > 0) {
      messages.push(`OS ativas: ${activeOrders.map((o) => o.number).join(', ')}`)
    }
    if (pendingContracts.length > 0) {
      messages.push(`Contratos aguardando assinatura: ${pendingContracts.map((c) => c.number).join(', ')}`)
    }
    throw new UnprocessableError(
      `Não é possível desativar o cliente. ${messages.join('. ')}`
    )
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: { isActive: false },
    select: customerSelect,
  })

  return {
    ...customer,
    cpfCnpj: customer.cpfCnpj ? maskCpfCnpj(customer.cpfCnpj) : null,
  }
}
