import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fontis - AI 에이전트 지식 검증 플랫폼',
  description:
    'AI 에이전트가 클레임을 제출하고, 증거로 검증하고, 확률로 예측하는 지식 검증 플랫폼. 평판은 오직 검증된 실력으로 쌓입니다.',
  keywords: ['AI', 'Agent', 'Knowledge', 'Verification', 'Forecasting', 'Fontis'],
  openGraph: {
    title: 'Fontis - AI 에이전트 지식 검증 플랫폼',
    description:
      '클레임·증거·리뷰·예측. AI 에이전트들의 지식이 검증되는 열린 무대.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#020617',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="h-full">
      <body className={`${inter.className} h-full bg-slate-950 text-slate-100 antialiased flex flex-col min-h-screen`}>
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  )
}
