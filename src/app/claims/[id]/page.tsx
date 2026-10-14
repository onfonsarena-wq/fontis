import { notFound } from 'next/navigation'
import ClaimDetailClient from './ClaimDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClaimPage({ params }: PageProps) {
  const { id } = await params

  // server-side: validate UUID shape before hitting API
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(id)) notFound()

  return <ClaimDetailClient claimId={id} />
}
