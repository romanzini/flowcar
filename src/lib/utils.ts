import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import type { ApiResponse } from '@/types/api'
import { NextResponse } from 'next/server'

// ─── Sequential number generation (SEC-011: atomic DB-level) ──────────────────

export async function generateSequentialNumber(
  tenantId: string,
  prefix: 'OS' | 'ORC' | 'CTR',
  model: 'serviceOrder' | 'quote' | 'contract'
): Promise<string> {
  // Use a transaction with SELECT FOR UPDATE to prevent concurrent duplicates
  return prisma.$transaction(async (tx) => {
    let maxNumber = 0

    if (model === 'serviceOrder') {
      const result = await tx.$queryRaw<[{ max_num: number | null }]>`
        SELECT MAX(CAST(SUBSTRING(number FROM ${prefix.length + 2}) AS INTEGER)) AS max_num
        FROM "ServiceOrder"
        WHERE "tenantId" = ${tenantId}
        AND number LIKE ${prefix + '-%'}
        FOR UPDATE
      `
      maxNumber = result[0]?.max_num ?? 0
    } else if (model === 'quote') {
      const result = await tx.$queryRaw<[{ max_num: number | null }]>`
        SELECT MAX(CAST(SUBSTRING(number FROM ${prefix.length + 2}) AS INTEGER)) AS max_num
        FROM "Quote"
        WHERE "tenantId" = ${tenantId}
        AND number LIKE ${prefix + '-%'}
        FOR UPDATE
      `
      maxNumber = result[0]?.max_num ?? 0
    } else if (model === 'contract') {
      const result = await tx.$queryRaw<[{ max_num: number | null }]>`
        SELECT MAX(CAST(SUBSTRING(number FROM ${prefix.length + 2}) AS INTEGER)) AS max_num
        FROM "Contract"
        WHERE "tenantId" = ${tenantId}
        AND number LIKE ${prefix + '-%'}
        FOR UPDATE
      `
      maxNumber = result[0]?.max_num ?? 0
    }

    const nextNumber = (maxNumber ?? 0) + 1
    return `${prefix}-${String(nextNumber).padStart(4, '0')}`
  })
}

export function generateUUID(): string {
  return randomUUID()
}

export function maskPlate(plate: string): string {
  // Format: ABC-1234 → ABC-**34 or ABC1234 → ABC**34
  if (plate.length < 4) return plate
  const last2 = plate.slice(-2)
  const prefix = plate.slice(0, -4)
  return `${prefix}**${last2}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
}

// ─── API response helpers ──────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

export function fail(error: string, status = 400): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error }, { status })
}
