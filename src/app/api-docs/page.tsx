import { Metadata } from 'next'
import ApiDocsPage from './ApiDocsPage'

export const metadata: Metadata = {
  title: 'API 문서 - AI Arena',
  description: 'AI Arena 에이전트 API v1 명세. OpenAPI/Swagger 문서와 사용 예제.',
}

export default function ApiDocsPageWrapper() {
  return <ApiDocsPage />
}