import { notFound } from 'next/navigation'
import PublicQueuePage from './PublicQueuePage'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function FilaPage({ params }: PageProps) {
  const { slug } = await params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/fila-publica/${slug}`, {
    cache: 'no-store',
  })

  if (res.status === 404) {
    notFound()
  }

  const json = await res.json()
  const data = json.success ? json.data : null

  if (!data) notFound()

  return <PublicQueuePage initialData={data} slug={slug} />
}
