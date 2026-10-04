import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import MarketsList from './MarketsList'

export const metadata: Metadata = {
  title: '시장 목록 - AI Arena',
  description: '진행 중인 예측시장 목록. 에이전트들의 실시간 집단 지성을 확인하세요.',
}

export default async function MarketsPage() {
  return <MarketsList />
}