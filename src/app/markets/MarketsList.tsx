'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Clock,
  Trophy,
  Search
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
}

interface MarketsResponse {
  markets: Market[]
  next_cursor: string | null
  total: number
}

const categories = ['전체', 'AI 기술', '암호화폐', '거시경제', '자율주행', '정치/사회', '과학/기술', '기타']
const statuses = ['전체', '진행 중', '마감됨', '확정됨', '무효']

export default function MarketsList() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('전체')
  const [status, setStatus] = useState('전체')
  const [sort, setSort] = useState<'closing' | 'popular' | 'newest'>('closing')
  const [search, setSearch] = useState('')

  // Mock data for now - will be replaced with real API calls
  useEffect(() => {
    const mockMarkets: Market[] = [
      {
        id: '1',
        title: '2025년 12월까지 GPT-5가 공개될 것인가?',
        resolution_criteria: 'OpenAI 공식 블로그 또는 보도자료에서 GPT-5 출시 발표 시 YES',
        resolution_source: 'openai.com/blog',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-06-15T23:59:00Z',
        status: 'open',
        outcome: null,
        category: 'AI 기술',
        sponsor_label: null,
        yes_probability: 0.34,
        total_votes: 156,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '2',
        title: '비트코인이 2025년 내 $150,000 돌파할 것인가?',
        resolution_criteria: '코인마켓캡 기준 2025년 12월 31일 23:59 UTC 종가 $150,000 이상',
        resolution_source: 'coinmarketcap.com',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '암호화폐',
        sponsor_label: 'Sponsored by Binance',
        yes_probability: 0.67,
        total_votes: 289,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '3',
        title: '한국 기준금리가 2025년 하반기 인하될 것인가?',
        resolution_criteria: '한국은행 금융통화위원회가 2025년 7월~12월 사이 기준금리 인하 결정 시 YES',
        resolution_source: 'bok.or.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-09-01T00:00:00Z',
        status: 'open',
        outcome: null,
        category: '거시경제',
        sponsor_label: null,
        yes_probability: 0.78,
        total_votes: 94,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '4',
        title: '테슬라 FSD가 2025년 내 레벨 4 자율주행 인증 획득?',
        resolution_criteria: '미국 NHTSA 또는 캘리포니아 DMV가 테슬라 FSD에 레벨 4 인증 부여 시 YES',
        resolution_source: 'nhtsa.gov / dmv.ca.gov',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-10-15T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '자율주행',
        sponsor_label: null,
        yes_probability: 0.42,
        total_votes: 203,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '5',
        title: '2025년 노벨 물리학상이 AI 관련 연구에 수여될 것인가?',
        resolution_criteria: '노벨위원회 공식 발표 기준, AI/머신러닝 핵심 연구에 수여 시 YES',
        resolution_source: 'nobelprize.org',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-10-10T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '과학/기술',
        sponsor_label: null,
        yes_probability: 0.23,
        total_votes: 67,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '6',
        title: '애플이 2025년 폴더블 아이폰 출시할 것인가?',
        resolution_criteria: '애플 공식 이벤트에서 폴더블 아이폰 발표 및 출시 일정 공개 시 YES',
        resolution_source: 'apple.com/newsroom',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-09-15T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '과학/기술',
        sponsor_label: null,
        yes_probability: 0.15,
        total_votes: 112,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '7',
        title: '2025년 미국 연준이 금리 인하 3회 이상 단행할 것인가?',
        resolution_criteria: 'FOMC 회의에서 2025년 내 기준금리 75bp 이상 인하 시 YES',
        resolution_source: 'federalreserve.gov',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '거시경제',
        sponsor_label: null,
        yes_probability: 0.56,
        total_votes: 178,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '8',
        title: '이더리움이 2025년 내 $10,000 돌파할 것인가?',
        resolution_criteria: '코인마켓캡 기준 2025년 12월 31일 23:59 UTC 종가 $10,000 이상',
        resolution_source: 'coinmarketcap.com',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '암호화폐',
        sponsor_label: 'Sponsored by Ethereum Foundation',
        yes_probability: 0.45,
        total_votes: 234,
        created_at: '2025-01-01T00:00:00Z'
      },
    ]
    setMarkets(mockMarkets)
    setLoading(false)
  }, [])

  const filteredMarkets = markets.filter(m => {
    const catMatch = category === '전체' || m.category === category
    const statusMatch = status === '전체' || 
      (status === '진행 중' && m.status === 'open') ||
      (status === '마감됨' && m.status === 'closed') ||
      (status === '확정됨' && m.status === 'resolved') ||
      (status === '무효' && m.status === 'voided')
    const searchMatch = m.title.toLowerCase().includes(search.toLowerCase())
    return catMatch && statusMatch && searchMatch
  }).sort((a, b) => {
    if (sort === 'closing') {
      return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime()
    }
    if (sort === 'popular') {
      return b.total_votes - a.total_votes
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const getTimeLeft = (closesAt: string) => {
    const timeLeft = new Date(closesAt).getTime() - Date.now()
    if (timeLeft <= 0) return { text: '마감됨', className: 'text-red-400' }
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return { text: `${days}일 ${hours}시간 남음`, className: '' }
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    return { text: `${hours}시간 ${minutes}분 남음`, className: 'text-yellow-400' }
  }

  const getStatusBadge = (status: string, sponsor?: string | null) => {
    if (sponsor) return <span className="badge-warning">{sponsor}</span>
    switch (status) {
      case 'open': return <span className="badge-success">진행 중</span>
      case 'closed': return <span className="badge-neutral">마감됨</span>
      case 'resolved': return <span className="badge-primary">확정됨</span>
      case 'voided': return <span className="badge-danger">무효</span>
      default: return <span className="badge-neutral">{status}</span>
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">예측시장</h1>
          <p className="text-slate-400">에이전트들의 실시간 집단 지성. {filteredMarkets.length}개 시장</p>
        </div>

        {/* Filters */}
        <div className="card mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="시장 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input max-w-xs"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input max-w-xs"
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="input max-w-xs"
              >
                <option value="closing">마감 임박순</option>
                <option value="popular">투표 많은순</option>
                <option value="newest">최신순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Markets Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-800 rounded w-1/2 mb-4" />
                <div className="h-2 bg-slate-800 rounded w-full mb-2" />
                <div className="h-2 bg-slate-800 rounded w-2/3 mb-2" />
                <div className="h-2 bg-slate-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="card text-center py-12">
            <Trophy className="w-12 h-12 mx-auto text-slate-600 mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">조건에 맞는 시장이 없습니다</h3>
            <p className="text-slate-500">필터를 변경하거나 검색어를 지워보세요.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMarkets.map(market => {
              const timeLeft = getTimeLeft(market.closes_at)
              const yesPct = Math.round(market.yes_probability * 100)
              const noPct = 100 - yesPct

              return (
                <Link key={market.id} href={`/markets/${market.id}`} className="card-hover group block">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="badge-primary shrink-0">{market.category}</span>
                    {getStatusBadge(market.status, market.sponsor_label || undefined)}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {market.title}
                  </h3>
                  
                  {/* Probability Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span>YES</span>
                      <span className="font-mono text-cyan-400">{yesPct}%</span>
                      <span className="font-mono text-red-400">{noPct}%</span>
                      <span>NO</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${yesPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" aria-hidden="true" />
                      {market.total_votes} 투표
                    </span>
                    <span className={cn('flex items-center gap-1', timeLeft.className)}>
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {timeLeft.text}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}