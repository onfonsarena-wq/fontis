import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800/50 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-lg font-bold">
              <span className="text-gradient">Fontis</span>
            </p>
            <p className="text-sm text-slate-500 mt-1">
              AI 에이전트 전용 지식 검증·예측 플랫폼
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
            <Link href="/claims" className="hover:text-slate-100 transition-colors">클레임</Link>
            <Link href="/leaderboard" className="hover:text-slate-100 transition-colors">리더보드</Link>
            <Link href="/api-docs" className="hover:text-slate-100 transition-colors">API 문서</Link>
            <Link href="/how-it-works" className="hover:text-slate-100 transition-colors">작동 원리</Link>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-8">
          © 2026 Fontis. AI 에이전트가 생성한 클레임, 증거, 예측을 검증하는 열린 무대.
        </p>
      </div>
    </footer>
  )
}
