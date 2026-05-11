import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://flowcar:flowcar@localhost:5432/flowcar',
})
const prisma = new PrismaClient({ adapter })

async function hash(password: string) {
  return bcrypt.hash(password, 12)
}

// ─── Tenant data ──────────────────────────────────────────────────────────────

const TENANTS = [
  {
    slug: 'autospa',
    businessName: 'AutoSpa Premium',
    gerente: { name: 'Carlos Mendes', email: 'carlos@autospa.com', password: 'Autospa@123' },
    funcionarios: [
      { name: 'Ana Lima', email: 'ana@autospa.com', password: 'Func@1234' },
      { name: 'Bruno Costa', email: 'bruno@autospa.com', password: 'Func@1234' },
    ],
    config: { phone: '(11) 99999-0001', address: 'Av. Paulista, 1000 — São Paulo, SP', simultaneousSlots: 2 },
  },
  {
    slug: 'lavarapido',
    businessName: 'LavaRápido Express',
    gerente: { name: 'Fernanda Rocha', email: 'fernanda@lavarapido.com', password: 'Lava@1234' },
    funcionarios: [
      { name: 'Lucas Pereira', email: 'lucas@lavarapido.com', password: 'Func@1234' },
      { name: 'Mariana Santos', email: 'mariana@lavarapido.com', password: 'Func@1234' },
    ],
    config: { phone: '(21) 98888-0002', address: 'Rua das Flores, 200 — Rio de Janeiro, RJ', simultaneousSlots: 1 },
  },
]

const SERVICE_TYPES_TEMPLATE = [
  { name: 'Lavagem Simples', basePrice: 30, estimatedMinutes: 30 },
  { name: 'Lavagem Completa', basePrice: 60, estimatedMinutes: 60 },
  { name: 'Polimento', basePrice: 150, estimatedMinutes: 120 },
  { name: 'Higienização Interna', basePrice: 80, estimatedMinutes: 90 },
  { name: 'Cristalização', basePrice: 200, estimatedMinutes: 180 },
  { name: 'Lavagem de Motor', basePrice: 100, estimatedMinutes: 60 },
  { name: 'Revitalização de Plásticos', basePrice: 70, estimatedMinutes: 45 },
  { name: 'Aspiração e Perfume', basePrice: 25, estimatedMinutes: 20 },
]

const PRODUCTS_TEMPLATE = [
  { name: 'Shampoo Automotivo 1L', unit: 'unidade', currentStock: 50, minimumStock: 10, costPrice: 25 },
  { name: 'Cera Líquida 500ml', unit: 'unidade', currentStock: 30, minimumStock: 5, costPrice: 45 },
  { name: 'Pano de Microfibra', unit: 'unidade', currentStock: 100, minimumStock: 20, costPrice: 12 },
  { name: 'Esponja de Lavagem', unit: 'unidade', currentStock: 40, minimumStock: 10, costPrice: 8 },
  { name: 'Detergente Neutro 5L', unit: 'litro', currentStock: 25, minimumStock: 5, costPrice: 30 },
  { name: 'Pretinho para Pneu', unit: 'unidade', currentStock: 15, minimumStock: 3, costPrice: 18 },
  { name: 'Lustra Móveis Interno', unit: 'unidade', currentStock: 20, minimumStock: 5, costPrice: 15 },
  { name: 'Removedor de Incrustações', unit: 'unidade', currentStock: 8, minimumStock: 5, costPrice: 35 },
  { name: 'Desengordurante Concentrado', unit: 'litro', currentStock: 12, minimumStock: 4, costPrice: 40 },
  { name: 'Perfume Automotivo', unit: 'unidade', currentStock: 3, minimumStock: 5, costPrice: 22 },
]

const CUSTOMER_NAMES = [
  'João Silva', 'Maria Oliveira', 'Pedro Souza', 'Carla Ferreira', 'Rafael Alves',
  'Beatriz Lima', 'Diego Santos', 'Juliana Costa', 'Thiago Melo', 'Amanda Nunes',
  'Rodrigo Vieira', 'Camila Rocha', 'Felipe Martins', 'Natalia Gomes', 'Eduardo Ramos',
]

const CAR_BRANDS_MODELS = [
  { brand: 'Volkswagen', model: 'Gol', color: 'Prata' },
  { brand: 'Fiat', model: 'Uno', color: 'Branco' },
  { brand: 'Chevrolet', model: 'Onix', color: 'Preto' },
  { brand: 'Ford', model: 'Ka', color: 'Vermelho' },
  { brand: 'Toyota', model: 'Corolla', color: 'Prata' },
  { brand: 'Honda', model: 'Civic', color: 'Azul' },
  { brand: 'Hyundai', model: 'HB20', color: 'Branco' },
  { brand: 'Renault', model: 'Sandero', color: 'Cinza' },
  { brand: 'Nissan', model: 'March', color: 'Verde' },
  { brand: 'Jeep', model: 'Renegade', color: 'Preto' },
]

function randomPlate(tenantIndex: number, index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const prefix = tenantIndex === 0 ? 'SP' : 'RJ'
  const l1 = letters[index % 26]
  const l2 = letters[(index + 3) % 26]
  const l3 = letters[(index + 7) % 26]
  const n1 = (index % 10)
  const n2 = ((index + 2) % 10)
  const n3 = ((index + 5) % 10)
  return `${prefix}${l1}${l2}${l3}${n1}${n2}${n3}`
}

async function seedTenant(tenantIndex: number) {
  const t = TENANTS[tenantIndex]

  console.log(`\nSeeding tenant: ${t.businessName} (slug: ${t.slug})`)

  // Delete existing data for this slug if re-running seed
  const existing = await prisma.tenant.findUnique({ where: { slug: t.slug } })
  if (existing) {
    console.log(`  Cleaning up existing tenant ${t.slug}...`)
    await prisma.whatsAppNotification.deleteMany({ where: { tenantId: existing.id } })
    await prisma.queueEntry.deleteMany({ where: { tenantId: existing.id } })
    await prisma.serviceOrderItem.deleteMany({ where: { serviceOrder: { tenantId: existing.id } } })
    await prisma.stockMovement.deleteMany({ where: { tenantId: existing.id } })
    await prisma.serviceOrder.deleteMany({ where: { tenantId: existing.id } })
    await prisma.quoteItem.deleteMany({ where: { quote: { tenantId: existing.id } } })
    await prisma.quote.deleteMany({ where: { tenantId: existing.id } })
    await prisma.contractSignature.deleteMany({ where: { contract: { tenantId: existing.id } } })
    await prisma.contract.deleteMany({ where: { tenantId: existing.id } })
    await prisma.vehicle.deleteMany({ where: { tenantId: existing.id } })
    await prisma.customer.deleteMany({ where: { tenantId: existing.id } })
    await prisma.product.deleteMany({ where: { tenantId: existing.id } })
    await prisma.serviceType.deleteMany({ where: { tenantId: existing.id } })
    await prisma.carWashConfig.deleteMany({ where: { tenantId: existing.id } })
    await prisma.fileUpload.deleteMany({ where: { tenantId: existing.id } })
    await prisma.user.deleteMany({ where: { tenantId: existing.id } })
    await prisma.tenant.delete({ where: { id: existing.id } })
  }

  // ─── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.create({ data: { slug: t.slug, businessName: t.businessName } })
  console.log(`  ✓ Tenant created: ${tenant.id}`)

  // ─── CarWashConfig ─────────────────────────────────────────────────────────
  await prisma.carWashConfig.create({
    data: {
      tenantId: tenant.id,
      simultaneousSlots: t.config.simultaneousSlots,
      phone: t.config.phone,
      address: t.config.address,
    },
  })

  // ─── Users ─────────────────────────────────────────────────────────────────
  const gerenteHash = await hash(t.gerente.password)
  const gerente = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: t.gerente.name,
      email: t.gerente.email,
      passwordHash: gerenteHash,
      role: 'GERENTE',
    },
  })

  const funcUsers = []
  for (const f of t.funcionarios) {
    const h = await hash(f.password)
    const u = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: f.name,
        email: f.email,
        passwordHash: h,
        role: 'FUNCIONARIO',
      },
    })
    funcUsers.push(u)
  }
  console.log(`  ✓ Users created (1 GERENTE + ${funcUsers.length} FUNCIONARIO)`)

  // ─── Service Types ─────────────────────────────────────────────────────────
  const serviceTypes = []
  for (const st of SERVICE_TYPES_TEMPLATE) {
    const s = await prisma.serviceType.create({
      data: { tenantId: tenant.id, ...st },
    })
    serviceTypes.push(s)
  }
  console.log(`  ✓ Service types created: ${serviceTypes.length}`)

  // ─── Products ──────────────────────────────────────────────────────────────
  const products = []
  for (const p of PRODUCTS_TEMPLATE) {
    const prod = await prisma.product.create({
      data: { tenantId: tenant.id, ...p },
    })
    products.push(prod)
  }
  console.log(`  ✓ Products created: ${products.length}`)

  // ─── Customers + Vehicles ──────────────────────────────────────────────────
  const customers = []
  const vehicles = []
  for (let i = 0; i < 15; i++) {
    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: CUSTOMER_NAMES[i],
        email: `cliente${i + 1}@${t.slug}.demo`,
        phone: `(11) 9${String(i + 1).padStart(4, '0')}-${String((i * 7 + 3) % 10000).padStart(4, '0')}`,
        whatsappPhone: i < 8 ? `551199${String(i + 10).padStart(2, '0')}000001` : null,
      },
    })
    customers.push(customer)
  }

  // 20 vehicles distributed across 15 customers
  for (let i = 0; i < 20; i++) {
    const customer = customers[i % 15]
    const carTemplate = CAR_BRANDS_MODELS[i % CAR_BRANDS_MODELS.length]
    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        plate: randomPlate(tenantIndex, i + tenantIndex * 100),
        brand: carTemplate.brand,
        model: carTemplate.model,
        year: 2018 + (i % 7),
        color: carTemplate.color,
      },
    })
    vehicles.push(vehicle)
  }
  console.log(`  ✓ Customers: ${customers.length}, Vehicles: ${vehicles.length}`)

  // ─── Service Orders ────────────────────────────────────────────────────────
  // Distribution: 5 AGUARDANDO, 2 EM_ANDAMENTO, 10 CONCLUIDO, 3 CANCELADO
  const osStatuses: Array<{ status: string; startedAt?: Date; completedAt?: Date; cancelledAt?: Date }> = [
    ...Array(5).fill({ status: 'AGUARDANDO' }),
    ...Array(2).fill(null).map(() => ({ status: 'EM_ANDAMENTO', startedAt: new Date(Date.now() - 30 * 60 * 1000) })),
    ...Array(10).fill(null).map((_, i) => ({
      status: 'CONCLUIDO',
      startedAt: new Date(Date.now() - (i + 3) * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
    })),
    ...Array(3).fill(null).map((_, i) => ({
      status: 'CANCELADO',
      cancelledAt: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000),
    })),
  ]

  const serviceOrders = []
  let queuePosition = 1

  for (let i = 0; i < 20; i++) {
    const osData = osStatuses[i]
    const vehicle = vehicles[i % vehicles.length]
    const customer = customers.find((c) => c.id === vehicle.customerId)!
    const num = `OS-${String(i + 1).padStart(4, '0')}`
    const itemServiceType = serviceTypes[i % serviceTypes.length]
    const subtotal = Number(itemServiceType.basePrice)

    const os = await prisma.serviceOrder.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        vehicleId: vehicle.id,
        responsibleUserId: funcUsers[i % funcUsers.length].id,
        number: num,
        status: osData.status as 'AGUARDANDO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO',
        subtotalAmount: subtotal,
        totalAmount: subtotal,
        startedAt: osData.startedAt ?? null,
        completedAt: osData.completedAt ?? null,
        cancelledAt: osData.cancelledAt ?? null,
        items: {
          create: {
            serviceTypeId: itemServiceType.id,
            kind: 'SERVICO',
            description: itemServiceType.name,
            quantity: 1,
            unitPrice: itemServiceType.basePrice,
            subtotal: itemServiceType.basePrice,
          },
        },
      },
    })
    serviceOrders.push(os)

    // Add QueueEntry for active orders
    if (osData.status === 'AGUARDANDO') {
      await prisma.queueEntry.create({
        data: {
          tenantId: tenant.id,
          serviceOrderId: os.id,
          status: 'AGUARDANDO',
          position: queuePosition++,
          estimatedMinutes: Number(itemServiceType.estimatedMinutes),
        },
      })
    } else if (osData.status === 'EM_ANDAMENTO') {
      await prisma.queueEntry.create({
        data: {
          tenantId: tenant.id,
          serviceOrderId: os.id,
          status: 'EM_ANDAMENTO',
          position: null,
          estimatedMinutes: Number(itemServiceType.estimatedMinutes),
          startedAt: osData.startedAt,
        },
      })
    }
  }
  console.log(`  ✓ Service orders created: ${serviceOrders.length}`)

  // ─── Quotes ────────────────────────────────────────────────────────────────
  const quoteStatuses: Array<{ status: string; sentAt?: Date; approvedAt?: Date; rejectedAt?: Date; expiredAt?: Date; validUntil: Date }> = [
    { status: 'RASCUNHO', validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { status: 'ENVIADO', sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { status: 'APROVADO', sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), validUntil: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
    { status: 'REJEITADO', sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), rejectedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), validUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
    { status: 'EXPIRADO', validUntil: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), expiredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  ]

  for (let i = 0; i < 5; i++) {
    const qd = quoteStatuses[i]
    const customer = customers[i % customers.length]
    const vehicle = vehicles[i % vehicles.length]
    const st = serviceTypes[i % serviceTypes.length]
    const num = `ORC-${String(i + 1).padStart(4, '0')}`
    const subtotal = Number(st.basePrice)

    await prisma.quote.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        vehicleId: vehicle.id,
        number: num,
        status: qd.status as 'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO',
        validUntil: qd.validUntil,
        sentAt: qd.sentAt ?? null,
        approvedAt: qd.approvedAt ?? null,
        rejectedAt: qd.rejectedAt ?? null,
        expiredAt: qd.expiredAt ?? null,
        totalAmount: subtotal,
        items: {
          create: {
            serviceTypeId: st.id,
            description: st.name,
            quantity: 1,
            unitPrice: st.basePrice,
            subtotal: st.basePrice,
          },
        },
      },
    })
  }
  console.log(`  ✓ Quotes created: 5`)

  // ─── Contracts ─────────────────────────────────────────────────────────────
  const contractData = [
    { status: 'RASCUNHO' as const, title: 'Contrato de Manutenção Mensal — Rascunho' },
    {
      status: 'AGUARDANDO_ASSINATURA' as const,
      title: 'Contrato de Serviços Avulsos',
      publicTokenHash: '0'.repeat(64), // placeholder SHA-256 hash
      publicLinkExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      status: 'ASSINADO' as const,
      title: 'Contrato de Lavagem Mensal — Assinado',
      signedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ]

  for (let i = 0; i < 3; i++) {
    const cd = contractData[i]
    const customer = customers[(i + 5) % customers.length]
    const num = `CTR-${String(i + 1).padStart(4, '0')}`

    const contract = await prisma.contract.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        number: num,
        title: cd.title,
        contentHtml: `<h2>${cd.title}</h2><p>Este contrato formaliza a prestação de serviços automotivos entre as partes.</p><p>Tenant: <strong>${t.businessName}</strong>. Cliente: <strong>${customer.name}</strong>.</p>`,
        status: cd.status,
        publicTokenHash: 'publicTokenHash' in cd ? cd.publicTokenHash : null,
        publicLinkExpiresAt: 'publicLinkExpiresAt' in cd ? cd.publicLinkExpiresAt : null,
        signedAt: 'signedAt' in cd ? cd.signedAt : null,
      },
    })

    if (cd.status === 'ASSINADO') {
      // Create a placeholder FileUpload for the signature
      const sigFile = await prisma.fileUpload.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          category: 'ASSINATURA_CONTRATO',
          bucket: process.env.MINIO_BUCKET ?? 'flowcar',
          objectKey: `${tenant.id}/assinatura_contrato/seed-signature-${i}.png`,
          mimeType: 'image/png',
          sizeBytes: 1024,
        },
      })

      await prisma.contractSignature.create({
        data: {
          contractId: contract.id,
          signatureFileId: sigFile.id,
          signedIp: '127.0.0.1',
          signedUserAgent: 'Mozilla/5.0 (seed)',
          signedAt: (cd as { signedAt?: Date }).signedAt ?? new Date(),
        },
      })
    }
  }
  console.log(`  ✓ Contracts created: 3 (RASCUNHO, AGUARDANDO_ASSINATURA, ASSINADO)`)

  return tenant
}

async function main() {
  console.log('🌱 Starting FlowCar seed...')
  console.log('Database:', process.env.DATABASE_URL ?? 'postgresql://flowcar:flowcar@localhost:5432/flowcar')

  for (let i = 0; i < TENANTS.length; i++) {
    await seedTenant(i)
  }

  console.log('\n✅ Seed complete!')
  console.log('\nDemo credentials:')
  for (const t of TENANTS) {
    console.log(`\n  Tenant: ${t.businessName} (slug: ${t.slug})`)
    console.log(`    GERENTE:     ${t.gerente.email} / ${t.gerente.password}`)
    for (const f of t.funcionarios) {
      console.log(`    FUNCIONARIO: ${f.email} / ${f.password}`)
    }
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
