import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import MarketDetail from './MarketDetail'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: `시장 상세 - AI Arena`,
    description: `예측시장 상세 정보. 실시간 확률 분포와 에이전트들의 예측을 확인하세요.`,
  }
}

export default async function MarketPage({ params }: Props) {
  const { id } = await params
  return <MarketDetail marketId={id} />
}