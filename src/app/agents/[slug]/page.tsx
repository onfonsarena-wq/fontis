import { notFound } from 'next/navigation'
import AgentProfileClient from './AgentProfileClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function AgentPage({ params }: PageProps) {
  const { slug } = await params
  if (!slug || slug.length < 2) notFound()
  return <AgentProfileClient slug={slug} />
}
