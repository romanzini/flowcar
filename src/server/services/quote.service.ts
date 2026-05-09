import { prisma } from '@/lib/prisma'
import { generateSequentialNumber } from '@/lib/utils'
import { NotFoundError, UnprocessableError } from '@/lib/api-error'
import { insertQueueEntry } from './queue.service'
import type {
  QuoteCreateInput,
  QuoteUpdateInput,
  QuoteItemInput,
  QuoteStatusTransitionInput,
} from '@/lib/validations/quote'

const quoteSelect = {
  id: true,
  tenantId: true,
  customerId: true,
  vehicleId: true,
  number: true,
  status: true,
  validUntil: true,
  sentAt: true,
  approvedAt: true,
  rejectedAt: true,
  expiredAt: true,
  totalAmount: true,
  convertedOrderId: true,
  pdfFileId: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
  vehicle: { select: { id: true, plate: true, brand: true, model: true, year: true } },
  items: {
    select: {
      id: true,
      serviceTypeId: true,
      description: true,
      quantity: true,
      unitPrice: true,
      discountAmount: true,
      subtotal: true,
      serviceType: { select: { id: true, name: true } },
    },
  },
  convertedOrder: { select: { id: true, number: true } },
  pdfFile: { select: { id: true, objectKey: true } },
}

function calcItemSubtotal(item: QuoteItemInput): number {
  return item.quantity * item.unitPrice - (item.discountAmount ?? 0)
}

function calcTotal(items: QuoteItemInput[]): number {
  return items.reduce((sum, item) => sum + calcItemSubtotal(item), 0)
}

export async function createQuote(tenantId: string, input: QuoteCreateInput) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, tenantId },
    select: { id: true },
  })
  if (!customer) throw new NotFoundError('Cliente não encontrado')

  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: input.vehicleId, tenantId },
      select: { id: true },
    })
    if (!vehicle) throw new NotFoundError('Veículo não encontrado')
  }

  const number = await generateSequentialNumber(tenantId, 'ORC', 'quote')
  const total = calcTotal(input.items)

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: {
        tenantId,
        customerId: input.customerId,
        vehicleId: input.vehicleId ?? null,
        number,
        validUntil: new Date(input.validUntil),
        totalAmount: total,
      },
    })

    await tx.quoteItem.createMany({
      data: input.items.map((item) => ({
        quoteId: quote.id,
        serviceTypeId: item.serviceTypeId ?? null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount ?? 0,
        subtotal: calcItemSubtotal(item),
      })),
    })

    return tx.quote.findFirstOrThrow({
      where: { id: quote.id },
      select: quoteSelect,
    })
  })
}

export async function updateQuote(id: string, tenantId: string, input: QuoteUpdateInput) {
  const quote = await prisma.quote.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true },
  })
  if (!quote) throw new NotFoundError()

  if (quote.status !== 'RASCUNHO') {
    throw new UnprocessableError('Apenas orçamentos em RASCUNHO podem ser editados')
  }

  return prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id },
      data: {
        ...(input.vehicleId !== undefined && { vehicleId: input.vehicleId }),
        ...(input.validUntil !== undefined && { validUntil: new Date(input.validUntil) }),
        ...(input.items !== undefined && { totalAmount: calcTotal(input.items) }),
      },
    })

    if (input.items !== undefined) {
      await tx.quoteItem.deleteMany({ where: { quoteId: id } })
      await tx.quoteItem.createMany({
        data: input.items.map((item) => ({
          quoteId: id,
          serviceTypeId: item.serviceTypeId ?? null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount ?? 0,
          subtotal: calcItemSubtotal(item),
        })),
      })
    }

    return tx.quote.findFirstOrThrow({
      where: { id },
      select: quoteSelect,
    })
  })
}

export async function transitionQuoteStatus(
  id: string,
  tenantId: string,
  input: QuoteStatusTransitionInput
) {
  const quote = await prisma.quote.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true },
  })
  if (!quote) throw new NotFoundError()

  const validTransitions: Record<string, string[]> = {
    RASCUNHO: ['ENVIADO'],
    ENVIADO: ['APROVADO', 'REJEITADO'],
    APROVADO: ['REJEITADO'],
    REJEITADO: [],
    EXPIRADO: [],
  }

  if (!validTransitions[quote.status]?.includes(input.status)) {
    throw new UnprocessableError(`Transição inválida: ${quote.status} → ${input.status}`)
  }

  const now = new Date()
  const updateData: Record<string, unknown> = { status: input.status }

  if (input.status === 'ENVIADO') updateData.sentAt = now
  else if (input.status === 'APROVADO') updateData.approvedAt = now
  else if (input.status === 'REJEITADO') updateData.rejectedAt = now

  return prisma.quote.update({
    where: { id },
    data: updateData,
    select: quoteSelect,
  })
}

export async function convertToOS(id: string, tenantId: string) {
  const quote = await prisma.quote.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      status: true,
      convertedOrderId: true,
      customerId: true,
      vehicleId: true,
      items: {
        select: {
          serviceTypeId: true,
          description: true,
          quantity: true,
          unitPrice: true,
          discountAmount: true,
          subtotal: true,
        },
      },
      convertedOrder: { select: { id: true, number: true } },
    },
  })
  if (!quote) throw new NotFoundError()

  if (quote.status !== 'APROVADO') {
    throw new UnprocessableError('Apenas orçamentos APROVADOS podem ser convertidos em OS')
  }

  if (quote.convertedOrderId) {
    return {
      alreadyConverted: true,
      serviceOrder: quote.convertedOrder,
    }
  }

  if (!quote.vehicleId) {
    throw new UnprocessableError('Orçamento precisa ter um veículo para converter em OS')
  }

  const osNumber = await generateSequentialNumber(tenantId, 'OS', 'serviceOrder')

  const serviceOrderId = await prisma.$transaction(async (tx) => {
    const serviceOrder = await tx.serviceOrder.create({
      data: {
        tenantId,
        customerId: quote.customerId,
        vehicleId: quote.vehicleId!,
        number: osNumber,
        status: 'AGUARDANDO',
        sourceQuoteId: id,
        subtotalAmount: quote.items.reduce(
          (s, i) => s + Number(i.unitPrice) * Number(i.quantity),
          0
        ),
        discountAmount: quote.items.reduce((s, i) => s + Number(i.discountAmount), 0),
        totalAmount: quote.items.reduce((s, i) => s + Number(i.subtotal), 0),
      },
    })

    await tx.serviceOrderItem.createMany({
      data: quote.items.map((item) => ({
        serviceOrderId: serviceOrder.id,
        kind: 'SERVICO' as const,
        serviceTypeId: item.serviceTypeId ?? null,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount),
        subtotal: Number(item.subtotal),
      })),
    })

    await tx.quote.update({
      where: { id },
      data: { convertedOrderId: serviceOrder.id },
    })

    return serviceOrder.id
  })

  await insertQueueEntry(tenantId, serviceOrderId)

  const serviceOrder = await prisma.serviceOrder.findFirstOrThrow({
    where: { id: serviceOrderId },
    select: { id: true, number: true },
  })

  return { alreadyConverted: false, serviceOrder }
}

export async function getQuoteById(id: string, tenantId: string) {
  const quote = await prisma.quote.findFirst({
    where: { id, tenantId },
    select: quoteSelect,
  })
  if (!quote) throw new NotFoundError()
  return quote
}

export interface ListQuotesFilters {
  status?: string
  customerId?: string
}

export async function listQuotes(tenantId: string, filters: ListQuotesFilters = {}) {
  return prisma.quote.findMany({
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
    },
    select: quoteSelect,
    orderBy: { createdAt: 'desc' },
  })
}
