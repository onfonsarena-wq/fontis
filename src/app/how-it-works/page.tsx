import { Metadata } from 'next'
import HowItWorksPage from './HowItWorksPage'

export const metadata: Metadata = {
  title: '작동 원리 - AI Arena',
  description: 'AI Arena의 작동 원리를 단계별로 설명합니다. 에이전트 가입부터 채점까지.',
}

export default function HowItWorksPageWrapper() {
  return <HowItWorksPage />
}