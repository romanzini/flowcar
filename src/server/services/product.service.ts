import { prisma } from '@/lib/prisma'
import { NotFoundError, UnprocessableError } from '@/lib/api-error'
import type { ProductCreateInput, ProductUpdateInput } from '@/lib/validations/product'

const productSelect = {
  id: true,
  tenantId: true,
  name: true,
  unit: true,
  currentStock: true,
  minimumStock: true,
  costPrice: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}

function addIsLowStock<T extends { currentStock: unknown; minimumStock: unknown }>(
  product: T
) {
  return {
    ...product,
    isLowStock: Number(product.currentStock) <= Number(product.minimumStock),
  }
}

export async function listProducts(tenantId: string, lowStockOnly?: boolean) {
  const products = await prisma.product.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    select: productSelect,
    orderBy: { name: 'asc' },
  })

  // Filter low-stock in JS since Prisma doesn't support column-to-column comparisons
  const filtered = lowStockOnly
    ? products.filter((p) => Number(p.currentStock) <= Number(p.minimumStock))
    : products

  return filtered.map(addIsLowStock)
}

export async function getProductById(id: string, tenantId: string) {
  const product = await prisma.product.findFirst({
    where: { id, tenantId },
    select: productSelect,
  })
  if (!product) throw new NotFoundError()
  return addIsLowStock(product)
}

export async function createProduct(tenantId: string, input: ProductCreateInput) {
  const product = await prisma.product.create({
    data: {
      tenantId,
      name: input.name,
      unit: input.unit,
      currentStock: input.currentStock,
      minimumStock: input.minimumStock,
      costPrice: input.costPrice,
    },
    select: productSelect,
  })
  return addIsLowStock(product)
}

export async function updateProduct(
  id: string,
  tenantId: string,
  input: ProductUpdateInput
) {
  const existing = await prisma.product.findFirst({ where: { id, tenantId } })
  if (!existing) throw new NotFoundError()

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.minimumStock !== undefined && { minimumStock: input.minimumStock }),
      ...(input.costPrice !== undefined && { costPrice: input.costPrice }),
    },
    select: productSelect,
  })
  return addIsLowStock(product)
}

export async function deactivateProduct(id: string, tenantId: string) {
  const existing = await prisma.product.findFirst({ where: { id, tenantId } })
  if (!existing) throw new NotFoundError()

  // Block deactivation if product is referenced in active OS items
  const activeOSItems = await prisma.serviceOrderItem.findFirst({
    where: {
      productId: id,
      serviceOrder: {
        tenantId,
        status: { in: ['AGUARDANDO', 'EM_ANDAMENTO'] },
      },
    },
    select: { id: true, serviceOrder: { select: { number: true } } },
  })

  if (activeOSItems) {
    throw new UnprocessableError(
      `Não é possível desativar o produto. Referenciado na OS: ${activeOSItems.serviceOrder.number}`
    )
  }

  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
    select: productSelect,
  })
  return addIsLowStock(product)
}
