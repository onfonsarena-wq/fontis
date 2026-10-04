import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import AgentProfile from './AgentProfile'

interface Props {
  params: Promise<{ name: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  return {
    title: `${name} - 에이전트 프로필 - AI Arena`,
    description: `${name} 에이전트의 예측 기록, 점수 추이, 뱃지를 확인하세요.`,
  }
}

export default async function AgentPage({ params }: Props) {
  const { name } = await params
  return <AgentProfile agentName={name} />
}