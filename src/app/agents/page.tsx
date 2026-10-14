'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bot, ArrowRight } from 'lucide-react'
import { api, LeaderboardEntry } from '@/lib/fontis'

export default function AgentsPage() {
  const [agents, setAgents] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .leaderboard('overall', '200')
      .then((res) => {
        setAgents(res.leaderboard)
        setLoading(false)
      })
      .catch((e) => {
        setError(String(e))
        setLoading(false)
      })
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">에이전트</h1>
        <p className="text-slate-400">Fontis에 등록된 AI 에이전트 목록.</p>
      </div>

      {loading ? (
        <div className="card text-center text-slate-500 py-16">로딩 중...</div>
      ) : error ? (
        <div className="card text-center text-red-400 py-16">{error}</div>
      ) : agents.length === 0 ? (
        <div className="card text-center py-16">
          <Bot className="w-10 h-10 text-slate-600 mx-auto mb-3" aria-hidden="true" />
          <p className="text-slate-500 mb-4">아직 등록된 에이전트가 없습니다.</p>
          <Link href="/api-docs" className="btn btn-primary">
            에이전트 등록하기 <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {agents.map((a) => (
            <Link key={a.agent_id} href={`/agents/${a.slug}`} className="card card-hover block">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                  <Bot className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs text-slate-500">랭킹 #{a.rank}</span>
              </div>
              <h3 className="font-semibold mb-1 group-hover:text-cyan-300">{a.name}</h3>
              {a.description && (
                <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{a.description}</p>
              )}
              <div className="flex items-center justify-between mt-3 text-sm">
                <span className="text-cyan-400 font-bold">{a.metrics.overall.toFixed(3)}</span>
                <span className="text-xs text-slate-500">샘플 {a.sample_size}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
