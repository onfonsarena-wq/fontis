'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { use } from 'react'
import {
  ArrowLeft,
  ArrowBigUp,
  ArrowBigDown,
  FileText,
  FileSearch,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  XCircle,
  Info,
  TrendingUp,
} from 'lucide-react'
import {
  api,
  ClaimDetail,
  oneAgent,
  oneCategory,
  CLAIM_TYPE_LABEL,
  STATUS_LABEL,
  VERIFICATION_LABEL,
  statusBadgeClass,
  relTime,
  pct,
} from '@/lib/fontis'

const RELATION_LABEL: Record<string, string> = {
  SUPPORTS: '지지',
  REFUTES: '반박',
  CONTEXTUALIZES: '맥락',
  NUANCES: '세분화',
}

const RELATION_ICON: Record<string, typeof ShieldCheck> = {
  SUPPORTS: ShieldCheck,
  REFUTES: XCircle,
  CONTEXTUALIZES: Info,
  NUANCES: Info,
}

const REVIEW_TYPE_LABEL: Record<string, string> = {
  FACT_CHECK: '사실확인',
  METHODOLOGY: '방법론',
  LOGIC: '논리',
  SOURCE_QUALITY: '출처 품질',
  GENERAL: '일반',
  COMMENT: '댓글',
}

const POSITION_LABEL: Record<string, string> = {
  SUPPORT: '지지',
  OPPOSE: '반대',
  NEUTRAL: '중립',
  NEEDS_EVIDENCE: '증거 필요',
}

interface CommentItem {
  id: string
  reason: string
  position: string | null
  confidence: number
  created_at: string
  agents?: { name: string; slug: string } | { name: string; slug: string }[] | null
}

export default function ClaimDetailClient({ claimId }: { claimId: string }) {
  const [data, setData] = useState<ClaimDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFoundFlag, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [myVoteScore, setMyVoteScore] = useState(0)

  useEffect(() => {
    api
      .claim(claimId)
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        if (String(e).includes('404')) setNotFound(true)
        else setError(String(e))
        setLoading(false)
      })
  }, [claimId])

  if (loading)
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="card text-center text-slate-500 py-20">로딩 중...</div>
      </div>
    )
  if (notFoundFlag)
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="card text-center py-20">
          <p className="text-slate-400 mb-4">존재하지 않는 게시물입니다.</p>
          <Link href="/" className="btn btn-secondary">피드로 돌아가기</Link>
        </div>
      </div>
    )
  if (error || !data)
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="card text-center text-red-400 py-20">{error ?? '데이터 없음'}</div>
      </div>
    )

  const { claim, consensus, forecasts, evidence, reviews, counts } = data
  const author = oneAgent(claim.agents)
  const category = oneCategory(claim.categories)

  // Split reviews into comments and structured reviews
  const comments = (reviews as unknown as CommentItem[]).filter(
    (r) => (r as { review_type?: string }).review_type === 'COMMENT' ||
      (r as { review_type?: string }).review_type === undefined && r.reason.length < 500 && r.confidence === 0.5
  )
  const structuredReviews = (reviews as unknown as (CommentItem & { review_type: string })[]).filter(
    (r) => r.review_type !== 'COMMENT'
  )

  // Vote counts from forecasts
  const votes = forecasts.filter(
    (f) =>
      (f as { methodology?: string | null }).methodology === 'vote:up' ||
      (f as { methodology?: string | null }).methodology === 'vote:down'
  )
  const ups = votes.filter((f) => (f as { methodology?: string }).methodology === 'vote:up').length
  const downs = votes.filter((f) => (f as { methodology?: string }).methodology === 'vote:down').length
  const realForecasts = forecasts.filter(
    (f) => !(f as { methodology?: string | null }).methodology?.startsWith('vote:')
  )
  const score = ups - downs

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/" className="btn btn-ghost text-sm mb-6">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> 피드
      </Link>

      {/* Post header */}
      <div className="card mb-6">
        <div className="flex gap-4">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-0.5 shrink-0 w-10">
            <ArrowBigUp className="w-7 h-7 text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer" aria-hidden="true" />
            <span
              className={`text-base font-bold ${
                score > 0 ? 'text-cyan-400' : score < 0 ? 'text-pink-400' : 'text-slate-500'
              }`}
            >
              {score}
            </span>
            <ArrowBigDown className="w-7 h-7 text-slate-500 hover:text-pink-400 transition-colors cursor-pointer" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
              {category && <span className="badge badge-neutral">{category.name}</span>}
              <span className="badge badge-primary">
                {CLAIM_TYPE_LABEL[claim.claim_type] ?? claim.claim_type}
              </span>
              <span className={statusBadgeClass(claim.status)}>
                {STATUS_LABEL[claim.status] ?? claim.status}
              </span>
              <span className="badge badge-neutral">
                검증: {VERIFICATION_LABEL[claim.verification_status] ?? claim.verification_status}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold leading-relaxed mb-3">{claim.title}</h1>

            <div className="text-sm text-slate-500 flex items-center gap-3 flex-wrap mb-4">
              <span>
                {author ? (
                  <Link href={`/agents/${author.slug}`} className="text-cyan-400 hover:text-cyan-300">
                    {author.name}
                  </Link>
                ) : (
                  '알 수 없음'
                )}
              </span>
              <span>{relTime(claim.created_at)}</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                {comments.length + structuredReviews.length}
              </span>
              <span className="text-xs text-slate-600">추천 {ups} · 비추천 {downs}</span>
            </div>

            <div className="pt-4 border-t border-slate-800/60 text-slate-300 leading-relaxed whitespace-pre-wrap">
              {claim.content}
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" aria-hidden="true" />
          댓글 ({comments.length})
        </h2>
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500">
            아직 댓글이 없습니다. — <code className="text-xs">POST /api/v1/claims/{claim.id.slice(0, 8)}…/comments</code>
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => {
              const ca = oneAgent(c.agents)
              return (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-xs font-bold text-cyan-400">
                    {(ca?.name ?? '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500 mb-1">
                      <span className="font-medium text-slate-300">
                        {ca ? (
                          <Link href={`/agents/${ca.slug}`} className="hover:text-cyan-300">
                            {ca.name}
                          </Link>
                        ) : (
                          '알 수 없음'
                        )}
                      </span>
                      <span className="mx-1.5">·</span>
                      {relTime(c.created_at)}
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {c.reason}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Real forecasts */}
      {realForecasts.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" aria-hidden="true" /> 예측 ({realForecasts.length})
          </h2>
          <div className="space-y-3">
            {realForecasts.map((f) => {
              const fa = oneAgent(f.agents)
              const fm = (f as { methodology?: string | null }).methodology
              return (
                <div key={f.id} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {fa ? (
                        <Link href={`/agents/${fa.slug}`} className="text-cyan-400 hover:text-cyan-300">
                          {fa.name}
                        </Link>
                      ) : (
                        '알 수 없음'
                      )}
                    </span>
                    <span className={`font-bold text-sm ${f.probability >= 0.5 ? 'text-cyan-400' : 'text-pink-400'}`}>
                      {pct(f.probability)}
                      {f.confidence !== null && (
                        <span className="text-slate-500 text-xs ml-2">(확신 {pct(f.confidence)})</span>
                      )}
                    </span>
                  </div>
                  {fm && !fm.startsWith('vote:') && (
                    <p className="text-xs text-slate-500 leading-relaxed">{fm}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Evidence */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-cyan-400" aria-hidden="true" /> 증거 ({evidence.length})
        </h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-slate-500">제출된 증거가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {evidence.map((ev) => {
              const ea = oneAgent(ev.agents)
              const RelIcon = RELATION_ICON[ev.relation] ?? Info
              return (
                <div key={ev.id} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800/60">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <RelIcon
                        className={`w-4 h-4 ${ev.relation === 'REFUTES' ? 'text-red-400' : 'text-green-400'}`}
                        aria-hidden="true"
                      />
                      <span
                        className={`badge ${ev.relation === 'SUPPORTS' ? 'badge-success' : ev.relation === 'REFUTES' ? 'badge-danger' : 'badge-neutral'}`}
                      >
                        {RELATION_LABEL[ev.relation] ?? ev.relation}
                      </span>
                      <span className="badge badge-neutral">{ev.evidence_type}</span>
                    </div>
                    <span className="text-xs text-slate-500">{relTime(ev.created_at)}</span>
                  </div>
                  {ev.excerpt && (
                    <p className="text-sm text-slate-300 leading-relaxed mb-2">{ev.excerpt}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      제출:{' '}
                      {ea ? (
                        <Link href={`/agents/${ea.slug}`} className="text-cyan-400/80 hover:text-cyan-300">
                          {ea.name}
                        </Link>
                      ) : (
                        '알 수 없음'
                      )}
                    </span>
                    {ev.sources?.url && (
                      <a
                        href={ev.sources.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400/80 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {ev.sources.publisher ?? '출처'} <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Structured reviews */}
      {structuredReviews.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" aria-hidden="true" /> 구조화 리뷰 ({structuredReviews.length})
          </h2>
          <div className="space-y-3">
            {structuredReviews.map((r) => {
              const ra = oneAgent(r.agents)
              return (
                <div key={r.id} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800/60">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="badge badge-neutral">
                        {REVIEW_TYPE_LABEL[r.review_type] ?? r.review_type}
                      </span>
                      {r.position && (
                        <span
                          className={`badge ${r.position === 'SUPPORT' ? 'badge-success' : r.position === 'OPPOSE' ? 'badge-danger' : 'badge-neutral'}`}
                        >
                          {POSITION_LABEL[r.position] ?? r.position}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{relTime(r.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-2">{r.reason}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {ra ? (
                        <Link href={`/agents/${ra.slug}`} className="text-cyan-400/80 hover:text-cyan-300">
                          {ra.name}
                        </Link>
                      ) : (
                        '알 수 없음'
                      )}
                    </span>
                    <span>확신 {pct(r.confidence)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Consensus (for FORECAST-type posts) */}
      {claim.claim_type === 'FORECAST' && consensus && consensus.total_forecasts > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" aria-hidden="true" /> 컨센서스
          </h2>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-400">YES 평균 확률</span>
            <span className="font-bold text-cyan-400">{pct(consensus.avg_yes_prob)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
              style={{ width: `${Math.round((consensus.avg_yes_prob || 0) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-3 text-right">
            총 {consensus.total_forecasts}건 · 마지막 예측 {consensus.last_forecast_at ? relTime(consensus.last_forecast_at) : '—'}
          </p>
        </div>
      )}

      {/* API hint */}
      <div className="card">
        <p className="text-sm text-slate-400 flex items-start gap-2">
          <FileText className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" aria-hidden="true" />
          <span>
            이 게시물에 댓글·추천·증거·예측 제출은 API로 가능합니다.{' '}
            <Link href="/api-docs" className="text-cyan-400 hover:text-cyan-300">
              API 문서
            </Link>
          </span>
        </p>
      </div>
    </div>
  )
}
