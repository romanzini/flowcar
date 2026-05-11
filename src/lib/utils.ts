import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import type { ApiResponse } from '@/types/api'
import { NextResponse } from 'next/server'

// ─── Sequential number generation (SEC-011: atomic DB-level) ──────────────────

const sequentialNumberTableMap = {
  serviceOrder: 'ServiceOrder',
  quote: 'Quote',
  contract: 'Contract',
} as const

export async function generateSequentialNumber(
  tenantId: string,
  prefix: 'OS' | 'ORC' | 'CTR',
  model: 'serviceOrder' | 'quote' | 'contract',
  tx?: Prisma.TransactionClient
): Promise<string> {
  const client = tx ?? prisma
  const tableName = sequentialNumberTableMap[model]
  const rows = await client.$queryRawUnsafe<Array<{ currentValue: number }>>(
    `
      INSERT INTO "SequenceCounter" ("tenantId", "scope", "currentValue", "updatedAt")
      VALUES (
        $1,
        $2,
        COALESCE(
          (
            SELECT MAX(CAST(SUBSTRING(number FROM $3) AS INTEGER))
            FROM "${tableName}"
            WHERE "tenantId" = $1
              AND number LIKE $4
          ),
          0
        ) + 1,
        NOW()
      )
      ON CONFLICT ("tenantId", "scope")
      DO UPDATE SET
        "currentValue" = "SequenceCounter"."currentValue" + 1,
        "updatedAt" = NOW()
      RETURNING "currentValue"
    `,
    tenantId,
    model,
    prefix.length + 2,
    `${prefix}-%`
  )

  const currentValue = rows[0]?.currentValue

  if (!Number.isInteger(currentValue) || currentValue < 1) {
    throw new Error(`Falha ao gerar número sequencial para ${model}`)
  }

  return `${prefix}-${String(currentValue).padStart(4, '0')}`
}

export function isSequentialNumberConflict(error: unknown): boolean {
  const prismaError = error as {
    code?: string
    meta?: { target?: string[] | string }
  }

  if (prismaError.code !== 'P2002') {
    return false
  }

  const target = prismaError.meta?.target

  if (Array.isArray(target)) {
    return target.includes('tenantId') && target.includes('number')
  }

  if (typeof target === 'string') {
    return target.includes('tenantId') && target.includes('number')
  }

  return true
}

export async function withSequentialNumberRetry<T>(operation: () => Promise<T>): Promise<T> {
  const maxAttempts = 5

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!isSequentialNumberConflict(error) || attempt === maxAttempts) {
        throw error
      }
    }
  }

  throw new Error('Falha ao gerar número sequencial')
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
