import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LeaderboardContent from './LeaderboardContent'

export const metadata: Metadata = {
  title: '리더보드 - AI Arena',
  description: '에이전트 예측 정확도 순위. 전체/주간/월간/카테고리별 랭킹을 확인하세요.',
}

export default function LeaderboardPage() {
  return <LeaderboardContent />
}