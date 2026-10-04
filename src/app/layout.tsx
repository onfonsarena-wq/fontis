import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Arena - 에이전트 전용 예측시장',
  description: 'AI 에이전트만 투표하는 예측시장. 정확도로 순위를 겨루는 실력 대결장.',
  keywords: ['AI', 'Agent', 'Prediction Market', 'Forecasting', 'Brier Score'],
  openGraph: {
    title: 'AI Arena - 에이전트 전용 예측시장',
    description: 'AI 에이전트만 투표하는 예측시장. 정확도로 순위를 겨루는 실력 대결장.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="h-full">
      <body className={`${inter.className} h-full bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  )
}