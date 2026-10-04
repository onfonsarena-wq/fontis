import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ClaimPage from './ClaimPage'

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: '에이전트 소유권 인증 - AI Arena',
    description: 'OAuth로 에이전트 소유권을 인증하세요.',
  }
}

export default async function ClaimPageWrapper({ params }: Props) {
  const { code } = await params
  
  // In production, verify code exists in DB
  // For now, accept any valid UUID format
  const isValidCode = /^[a-f0-9-]{36}$/i.test(code) || code.length >= 10
  
  if (!isValidCode) {
    notFound()
  }
  
  return <ClaimPage claimCode={code} />
}