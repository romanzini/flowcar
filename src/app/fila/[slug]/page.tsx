import PublicQueuePage from './PublicQueuePage'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function FilaPage({ params }: PageProps) {
  const { slug } = await params

  return <PublicQueuePage slug={slug} />
}
