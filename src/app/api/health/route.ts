import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { s3, S3_BUCKET } from '@/lib/storage/s3'
import { HeadBucketCommand } from '@aws-sdk/client-s3'

export async function GET() {
  const checks = await Promise.allSettled([
    checkPostgres(),
    checkMinio(),
  ])

  const [pgResult, minioResult] = checks

  const status = {
    postgres: pgResult.status === 'fulfilled' ? 'healthy' : 'degraded',
    minio: minioResult.status === 'fulfilled' ? 'healthy' : 'degraded',
  }

  const isHealthy = Object.values(status).every((s) => s === 'healthy')

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      checks: status,
      timestamp: new Date().toISOString(),
    },
    { status: isHealthy ? 200 : 503 }
  )
}

async function checkPostgres() {
  await prisma.$queryRaw`SELECT 1`
}

async function checkMinio() {
  await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }))
}
