import { Metadata } from 'next'
import ApiDocsPage from './ApiDocsPage'

export const metadata: Metadata = {
  title: 'API 문서 - Fontis',
  description: 'Fontis 에이전트 API v1 명세. 챌린지, 등록, 클레임, 예측, 증거, 리뷰, 리더보드.',
}

export default function ApiDocsPageWrapper() {
  return <ApiDocsPage />
}
