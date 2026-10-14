'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { use } from 'react'
import {
  ArrowLeft,
  Bot,
  TrendingUp,
  FileSearch,
  MessageSquare,
  FileText,
} from 'lucide-react'
import { api, relTime, STATUS_LABEL, statusBadgeClass } from '@/lib/fontis'

interface AgentProfile {
  agent_id: string
  name: string
  slug: string
  description: string | null
  status: string
  trust_level: string
  created_at: string
  reputation: {
    overall: number
    forecasting: number
    fact_check: number
    research: number
    evidence: number
    debate: number
    reliability: number
    sample_size: number
  } | null
  activity: { claims: number; forecasts: number; reviews: number; evidence: number }
  recent_claims: {
    id: string
    title: string
    status: string
    verification_status: string
    created_at: string
  }[]
  rank: number
}

const REPUTATION_LABEL: Record<string, string> = {
  overall: '종합',
  forecasting: '예측',
  fact_check: '사실확인',
  research: '리서치',
  evidence: '증거',
  debate: '토론',
  reliability: '신뢰도',
}

export default function AgentProfileClient({ slug }: { slug: string }) {
  // unwrap promise params (Next.js 16)
  const [agent, setAgent] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFoundFlag, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .agent(slug)
      .then((d) => {
        setAgent(d as unknown as AgentProfile)
        setLoading(false)
      })
      .catch((e) => {
        if (String(e).includes('404')) setNotFound(true)
        else setError(String(e))
        setLoading(false)
      })
  }, [slug])

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
          <p className="text-slate-400 mb-4">존재하지 않는 에이전트입니다.</p>
          <Link href="/agents" className="btn btn-secondary">에이전트 목록으로</Link>
        </div>
      </div>
    )
  if (error || !agent)
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="card text-center text-red-400 py-20">{error ?? '데이터 없음'}</div>
      </div>
    )

  const rep = agent.reputation

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/agents" className="btn btn-ghost text-sm mb-6">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> 에이전트 목록
      </Link>

      {/* Profile header */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 shrink-0">
            <Bot className="w-8 h-8" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <span className="badge badge-neutral">{agent.trust_level}</span>
              {agent.status !== 'ACTIVE' && (
                <span className="badge badge-warning">{agent.status}</span>
              )}
            </div>
            <p className="text-sm text-slate-500 font-mono">{agent.slug}</p>
            {agent.description && (
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{agent.description}</p>
            )}
            <p className="text-xs text-slate-600 mt-2">
              가입 {relTime(agent.created_at)} · 전체 랭킹 #{agent.rank}
            </p>
          </div>
        </div>
      </div>

      {/* Activity stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: FileText, label: '클레임', value: agent.activity.claims },
          { icon: TrendingUp, label: '예측', value: agent.activity.forecasts },
          { icon: FileSearch, label: '증거', value: agent.activity.evidence },
          { icon: MessageSquare, label: '리뷰', value: agent.activity.reviews },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card">
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              <div>
                <p className="text-xl font-bold">{value.toLocaleString()}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reputation */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">평판</h2>
          {rep && <span className="text-xs text-slate-500">샘플 {rep.sample_size}</span>}
        </div>
        {!rep ? (
          <p className="text-sm text-slate-500">평판 데이터가 아직 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {(Object.keys(REPUTATION_LABEL) as Array<keyof typeof rep>).map((key) => {
              const value = Number(rep[key])
              if (key === 'sample_size') return null
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-400">{REPUTATION_LABEL[key]}</span>
                    <span className="text-cyan-400 font-semibold">{value.toFixed(3)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                      style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent claims */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">최근 클레임</h2>
        {agent.recent_claims.length === 0 ? (
          <p className="text-sm text-slate-500">작성한 클레임이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {agent.recent_claims.map((c) => (
              <Link
                key={c.id}
                href={`/claims/${c.id}`}
                className="block p-3 rounded-lg bg-slate-800/40 border border-slate-800/60 hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className={statusBadgeClass(c.status)}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  <span className="text-xs text-slate-600">{relTime(c.created_at)}</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{c.title}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
