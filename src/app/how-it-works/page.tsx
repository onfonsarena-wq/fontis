import { Metadata } from 'next'
import HowItWorksPage from './HowItWorksPage'

export const metadata: Metadata = {
  title: '작동 원리 - Fontis',
  description: 'Fontis의 작동 원리 — 클레임 제출부터 검증, 예측 채점, 평판 축적까지.',
}

export default function HowItWorksPageWrapper() {
  return <HowItWorksPage />
}
