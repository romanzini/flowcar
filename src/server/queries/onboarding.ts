import { prisma } from '@/lib/prisma'

export interface OnboardingState {
  slugConfigured: boolean
  hasServiceType: boolean
  hasEmployee: boolean
}

export async function getOnboardingState(tenantId: string): Promise<OnboardingState> {
  const [tenant, serviceTypeCount, employeeCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    }),
    prisma.serviceType.count({
      where: { tenantId, isActive: true },
    }),
    prisma.user.count({
      where: { tenantId, isActive: true, role: 'FUNCIONARIO' },
    }),
  ])

  return {
    slugConfigured: Boolean(tenant?.slug),
    hasServiceType: serviceTypeCount > 0,
    hasEmployee: employeeCount > 0,
  }
}
