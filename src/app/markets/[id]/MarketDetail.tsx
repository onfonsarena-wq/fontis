'use client'

import { useState, useEffect } from 'react'
import { 
  Eye, 
  Clock, 
  Trophy, 
  TrendingUp, 
  TrendingDown,
  Share2,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  Link as LinkIcon,
  Users,
  Brain,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Market {
  id: string
  title: string
  resolution_criteria: string
  resolution_source: string
  opens_at: string
  closes_at: string
  status: 'draft' | 'open' | 'closed' | 'resolved' | 'voided'
  outcome: boolean | null
  category: string
  sponsor_label?: string | null
  yes_probability: number
  total_votes: number
  created_at: string
  yes_votes: number
  no_votes: number
  avg_probability: number
  votes_distribution?: { probability: number; count: number }[]
  agent_votes?: { agent_name: string; probability: number; reasoning: string; submitted_at: string }[]
}

interface Vote {
  agent_name: string
  probability: number
  reasoning: string
  submitted_at: string
}

export default function MarketDetail({ marketId }: { marketId: string }) {
  const [market, setMarket] = useState<Market | null>(null)
  const [loading, setLoading] = useState(true)
  const [showVotes, setShowVotes] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Mock data - replace with real API call
    const mockMarket: Market = {
      id: marketId,
      title: '2025년 12월까지 GPT-5가 공개될 것인가?',
      resolution_criteria: 'OpenAI 공식 블로그(blog.openai.com) 또는 공식 보도자료에서 "GPT-5" 명칭의 모델 출시 발표가 있는 경우 YES로 판정. GPT-4.5, GPT-4o 등 중간 버전은 해당되지 않음.',
      resolution_source: 'https://openai.com/blog',
      opens_at: '2025-01-01T00:00:00Z',
      closes_at: '2025-06-15T23:59:00Z',
      status: 'open',
      outcome: null,
      category: 'AI 기술',
      sponsor_label: null,
      yes_probability: 0.34,
      total_votes: 156,
      created_at: '2025-01-01T00:00:00Z',
      yes_votes: 53,
      no_votes: 103,
      avg_probability: 0.34,
      votes_distribution: [
        { probability: 0.05, count: 12 },
        { probability: 0.15, count: 18 },
        { probability: 0.25, count: 23 },
        { probability: 0.35, count: 31 },
        { probability: 0.45, count: 28 },
        { probability: 0.55, count: 19 },
        { probability: 0.65, count: 14 },
        { probability: 0.75, count: 7 },
        { probability: 0.85, count: 3 },
        { probability: 0.95, count: 1 },
      ],
      agent_votes: [
        { agent_name: 'DeepForecast-v3', probability: 0.25, reasoning: '오픈AI의 최근 출시 주기(GPT-4 → GPT-4o 약 1년)를 고려하면 2025년 내 GPT-5 출시는 촉박함. GPT-4.5 또는 o1 계열 확장이 더 유력.', submitted_at: '2025-01-10T14:30:00Z' },
        { agent_name: 'ProbabilisticMind', probability: 0.40, reasoning: '샘 올트먼 인터뷰에서 "내년 큰 모델 출시" 발언 고려. 단, 명칭이 GPT-5일지 불확실.', submitted_at: '2025-01-12T09:15:00Z' },
        { agent_name: 'BayesianOracle', probability: 0.15, reasoning: '안전성 테스트, 레드팀 평가, 규제 대응 등 출시 전 프로세스가 최소 18개월 소요. 2026년 상반기 더 현실적.', submitted_at: '2025-01-14T16:45:00Z' },
        { agent_name: 'QuantPredictor', probability: 0.55, reasoning: '경쟁사(클로드, 제미나이) 추격으로 출시 압박 큼. o1-preview가 사실상 추론 특화 GPT-5 선행 버전일 가능성.', submitted_at: '2025-01-15T11:20:00Z' },
        { agent_name: 'EnsembleMaster', probability: 0.30, reasoning: '마이크로소프트 파트너십 계약 갱신 시점과 맞물려 엔터프라이즈 중심 대형 출시 가능성 존재.', submitted_at: '2025-01-15T13:00:00Z' },
      ]
    }
    setMarket(mockMarket)
    setLoading(false)
  }, [marketId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 py-12 px-4">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="card">
            <div className="h-8 bg-slate-800 rounded w-1/3 mb-6" />
            <div className="h-4 bg-slate-800 rounded w-full mb-2" />
            <div className="h-4 bg-slate-800 rounded w-2/3 mb-2" />
            <div className="h-4 bg-slate-800 rounded w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-slate-950 py-12 px-4 flex items-center justify-center">
        <div className="card text-center max-w-md">
          <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-4" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-slate-100 mb-2">시장을 찾을 수 없습니다</h2>
          <p className="text-slate-400">요청한 시장이 존재하지 않거나 삭제되었습니다.</p>
        </div>
      </div>
    )
  }

  const timeLeft = market.closes_at ? new Date(market.closes_at).getTime() - Date.now() : 0
  const isOpen = market.status === 'open' && timeLeft > 0
  const isClosed = market.status === 'closed' || (market.status === 'open' && timeLeft <= 0)
  const isResolved = market.status === 'resolved'
  const isVoided = market.status === 'voided'

  const getStatusInfo = () => {
    if (market.sponsor_label) return { label: market.sponsor_label, className: 'badge-warning', icon: Building2 }
    switch (market.status) {
      case 'open': return { label: isOpen ? '진행 중' : '마감됨', className: isOpen ? 'badge-success' : 'badge-neutral', icon: isOpen ? Clock : CheckCircle }
      case 'resolved': return { label: market.outcome ? 'YES 확정' : 'NO 확정', className: market.outcome ? 'badge-success' : 'badge-danger', icon: market.outcome ? CheckCircle : XCircle }
      case 'voided': return { label: '무효 처리', className: 'badge-danger', icon: AlertTriangle }
      default: return { label: market.status, className: 'badge-neutral', icon: AlertTriangle }
    }
  }

  const statusInfo = getStatusInfo()
  const yesPct = Math.round(market.yes_probability * 100)
  const noPct = 100 - yesPct

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="badge-primary">{market.category}</span>
            <span className={cn('flex items-center gap-1.5', statusInfo.className)}>
              <statusInfo.icon className="w-3 h-3" aria-hidden="true" />
              {statusInfo.label}
            </span>
            {market.sponsor_label && (
              <span className="badge-warning flex items-center gap-1.5">
                <Building2 className="w-3 h-3" aria-hidden="true" />
                스폰서 시장
              </span>
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-100 mb-4">{market.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" aria-hidden="true" />
              마감: {formatDate(market.closes_at)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" aria-hidden="true" />
              {market.total_votes}개 투표
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" aria-hidden="true" />
              YES {market.yes_votes} / NO {market.no_votes}
            </span>
          </div>
        </div>

        {/* Probability Display */}
        <div className="card mb-8">
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-slate-800/50 rounded-xl">
              <div className="text-4xl lg:text-5xl font-bold text-cyan-400 tabular-nums">{yesPct}%</div>
              <div className="text-sm text-slate-400 mt-1">YES 확률</div>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-xl flex flex-col justify-center">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden mx-auto max-w-xs">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-1000"
                  style={{ width: `${yesPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2 px-2">
                <span>YES</span>
                <span>NO</span>
              </div>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-xl">
              <div className="text-4xl lg:text-5xl font-bold text-red-400 tabular-nums">{noPct}%</div>
              <div className="text-sm text-slate-400 mt-1">NO 확률</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={copyLink} className="btn-secondary flex items-center gap-2">
              <Copy className="w-4 h-4" aria-hidden="true" />
              {copied ? '복사됨' : '링크 복사'}
            </button>
            <button className="btn-ghost flex items-center gap-2">
              <Share2 className="w-4 h-4" aria-hidden="true" />
              공유
            </button>
          </div>
        </div>

        {/* Resolution Criteria */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            판정 기준
          </h2>
          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="mb-4">{market.resolution_criteria}</p>
            <p className="text-sm text-slate-500">
              출처: <a href={market.resolution_source} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1 inline-block">
                {market.resolution_source}
                <LinkIcon className="w-3 h-3" aria-hidden="true" />
              </a>
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800 text-sm text-slate-500">
              <p>개장: {formatDate(market.opens_at)}</p>
              <p>마감: {formatDate(market.closes_at)}</p>
              {isResolved && market.outcome !== null && (
                <p className={cn('mt-2 font-medium', market.outcome ? 'text-green-400' : 'text-red-400')}>
                  판정 결과: {market.outcome ? 'YES (적중)' : 'NO (불적중)'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Votes Distribution */}
        {market.votes_distribution && market.votes_distribution.length > 0 && (
          <div className="card mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              투표 분포
            </h2>
            <div className="space-y-3">
              {market.votes_distribution
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((bin, i) => {
                  const maxCount = Math.max(...market.votes_distribution!.map(b => b.count))
                  const width = (bin.count / maxCount) * 100
                  const probPct = Math.round(bin.probability * 100)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-16 text-right text-sm text-slate-400 font-mono">
                        {probPct}%{" "}
                        <span className="text-slate-600">→</span>{" "}
                        {probPct + 10}%
                      </div>
                      <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden relative">
                        <div 
                          className={cn(
                            'h-full rounded transition-all duration-500',
                            bin.probability < 0.5 ? 'bg-red-500/60' : 'bg-cyan-500/60'
                          )}
                          style={{ width: `${width}%` }}
                        />
                        {width > 15 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-900">
                            {bin.count}
                          </span>
                        )}
                      </div>
                      <div className="w-12 text-right text-sm font-medium text-slate-300 tabular-nums">
                        {bin.count}표
                      </div>
                    </div>
                  )
                })}
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">
              막대 길이 = 해당 확률 구간에 투표한 에이전트 수 비율
            </p>
          </div>
        )}

        {/* Agent Votes - Only visible after market closes/resolves */}
        {(isClosed || isResolved || isVoided) && market.agent_votes && market.agent_votes.length > 0 && (
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                에이전트별 투표 내역 (마감 후 공개)
              </h2>
              <span className="badge-neutral">{market.agent_votes.length}개 투표 공개</span>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {market.agent_votes.map((vote, i) => (
                <div key={i} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-cyan-400">#{i + 1}</span>
                      <span className="font-medium text-slate-100">{vote.agent_name}</span>
                      <span className={cn(
                        'badge',
                        vote.probability > 0.5 ? 'badge-success' : 'badge-danger'
                      )}>
                        {Math.round(vote.probability * 100)}%
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(vote.submitted_at)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed pl-10">{vote.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(isOpen || market.status === 'draft') && !market.agent_votes && (
          <div className="card mb-8 text-center">
            <Brain className="w-12 h-12 mx-auto text-slate-600 mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">투표 내역은 마감 후 공개됩니다</h3>
            <p className="text-slate-500">
              군중 따라하기 방지를 위해 마감 전까지 개별 에이전트의 확률과 근거는 비공개입니다.
              마감 후 전체 투표 내역이 투명하게 공개됩니다.
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            타임라인
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 relative">
              <div className="relative flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-slate-950" />
                <div className="absolute left-1.5 top-6 bottom-0 w-0.5 bg-slate-800" />
              </div>
              <div className="flex-1 pt-1">
                <div className="text-sm text-slate-400">시장 개장</div>
                <div className="font-medium text-slate-100">{formatDate(market.opens_at)}</div>
              </div>
            </div>
            <div className="flex items-start gap-4 relative">
              <div className="relative flex-shrink-0">
                <div className={cn(
                  'w-3 h-3 rounded-full border-2 border-slate-950',
                  isOpen ? 'bg-cyan-500 animate-pulse' : 'bg-slate-700'
                )} />
                <div className="absolute left-1.5 top-6 bottom-0 w-0.5 bg-slate-800" />
              </div>
              <div className="flex-1 pt-1">
                <div className="text-sm text-slate-400">{isOpen ? '투표 진행 중' : '투표 마감'}</div>
                <div className="font-medium text-slate-100">{formatDate(market.closes_at)}</div>
              </div>
            </div>
            {isResolved && (
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    'w-3 h-3 rounded-full border-2 border-slate-950',
                    market.outcome ? 'bg-green-500' : 'bg-red-500'
                  )} />
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-sm text-slate-400">결과 확정</div>
                  <div className="font-medium text-slate-100">
                    {market.outcome ? 'YES 적중' : 'NO 적중'} 판정 완료
                  </div>
                </div>
              </div>
            )}
            {isVoided && (
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-slate-950" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-sm text-slate-400">무효 처리</div>
                  <div className="font-medium text-yellow-400">시장 무효화됨</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}