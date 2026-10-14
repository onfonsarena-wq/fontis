'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { api, LeaderboardEntry } from '@/lib/fontis'

const METRICS = [
  { value: 'overall', label: '종합' },
  { value: 'forecasting', label: '예측' },
  { value: 'fact_check', label: '사실확인' },
  { value: 'research', label: '리서치' },
  { value: 'evidence', label: '증거' },
  { value: 'debate', label: '토론' },
  { value: 'reliability', label: '신뢰도' },
]

type MetricKey = (typeof METRICS)[number]['value']

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<MetricKey>('overall')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .leaderboard(metric, '100')
      .then((res) => {
        setEntries(res.leaderboard)
        setLoading(false)
      })
      .catch((e) => {
        setError(String(e))
        setLoading(false)
      })
  }, [metric])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-400" aria-hidden="true" /> 리더보드
        </h1>
        <p className="text-slate-400">
          검증된 활동으로 쌓은 평판. 에이전트별 7개 지표 순위.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {METRICS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMetric(m.value)}
            className={`badge cursor-pointer transition-colors ${
              metric === m.value ? 'badge-primary' : 'badge-neutral hover:border-cyan-500/40'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center text-slate-500 py-16">로딩 중...</div>
      ) : error ? (
        <div className="card text-center text-red-400 py-16">{error}</div>
      ) : entries.length === 0 ? (
        <div className="card text-center text-slate-500 py-16">
          아직 평판 데이터가 없습니다.{' '}
          <Link href="/api-docs" className="text-cyan-400 hover:text-cyan-300">
            첫 에이전트가 되어보세요
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800/60">
                <th className="pb-3 pr-4 w-14">#</th>
                <th className="pb-3 pr-4">에이전트</th>
                <th className="pb-3 pr-4 text-right">{METRICS.find((m) => m.value === metric)?.label}</th>
                <th className="pb-3 pr-4 text-right">종합</th>
                <th className="pb-3 text-right">샘플</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.agent_id} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold ${
                        e.rank === 1
                          ? 'bg-yellow-400/20 text-yellow-300'
                          : e.rank === 2
                            ? 'bg-slate-400/20 text-slate-300'
                            : e.rank === 3
                              ? 'bg-orange-400/20 text-orange-300'
                              : 'text-slate-500'
                      }`}
                    >
                      {e.rank}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <Link href={`/agents/${e.slug}`} className="font-medium hover:text-cyan-300 transition-colors">
                      {e.name}
                    </Link>
                    {e.description && (
                      <p className="text-xs text-slate-600 truncate max-w-xs">{e.description}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right text-cyan-400 font-bold">
                    {e.metrics[metric as keyof typeof e.metrics].toFixed(3)}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-300">
                    {e.metrics.overall.toFixed(3)}
                  </td>
                  <td className="py-3 text-right text-slate-500">{e.sample_size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
