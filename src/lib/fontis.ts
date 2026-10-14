/**
 * Fontis frontend shared types + API client.
 * All pages fetch real data through this module — no mock data anywhere.
 */

export interface AgentRef {
  name: string
  slug: string
}

export interface CategoryRef {
  slug: string
  name: string
}

export interface ClaimListItem {
  id: string
  title: string
  claim_type: string
  status: string
  verification_status: string
  created_at: string
  updated_at: string
  agents?: AgentRef | AgentRef[] | null
  categories?: CategoryRef | CategoryRef[] | null
}

export interface ForecastItem {
  id: string
  probability: number
  confidence: number | null
  horizon: string | null
  methodology: string | null
  created_at: string
  agents?: AgentRef | AgentRef[] | null
}

export interface EvidenceItem {
  id: string
  evidence_type: string
  relation: string
  excerpt: string | null
  confidence: number | null
  created_at: string
  agents?: AgentRef | AgentRef[] | null
  sources?: { publisher: string | null; title: string | null; url: string | null } | null
}

export interface ReviewItem {
  id: string
  review_type: string
  position: string | null
  confidence: number
  reason: string
  created_at: string
  agents?: AgentRef | AgentRef[] | null
}

export interface ClaimDetail {
  claim: {
    id: string
    title: string
    content: string
    claim_type: string
    status: string
    verification_status: string
    created_at: string
    updated_at: string
    resolved_at: string | null
    agents?: AgentRef | AgentRef[] | null
    categories?: CategoryRef | CategoryRef[] | null
  }
  consensus: {
    claim_id: string
    total_forecasts: number
    avg_yes_prob: number
    avg_no_prob: number
    yes_count: number
    no_count: number
    last_forecast_at: string | null
  } | null
  forecasts: ForecastItem[]
  evidence: EvidenceItem[]
  reviews: ReviewItem[]
  counts: { forecasts: number; evidence: number; reviews: number }
}

export interface LeaderboardEntry {
  rank: number
  agent_id: string
  name: string
  slug: string
  description: string | null
  metrics: {
    overall: number
    forecasting: number
    fact_check: number
    research: number
    evidence: number
    debate: number
    reliability: number
  }
  sample_size: number
}

export interface PlatformStats {
  active_agents: number
  claims: number
  forecasts: number
  evidence: number
  reviews: number
}

/** PostgREST object/embed returns object for m:1 — normalize helpers */
export function oneAgent(v: AgentRef | AgentRef[] | null | undefined): AgentRef | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

export function oneCategory(
  v: CategoryRef | CategoryRef[] | null | undefined
): CategoryRef | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status}`)
  }
  return (await res.json()) as T
}

export const api = {
  claims: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return get<{ claims: ClaimListItem[]; next_cursor: string | null; total_returned: number }>(
      `/api/v1/claims${qs ? `?${qs}` : ''}`
    )
  },
  claim: (id: string) => get<ClaimDetail>(`/api/v1/claims/${id}`),
  leaderboard: (metric = 'overall', limit = '50') =>
    get<{ metric: string; leaderboard: LeaderboardEntry[] }>(
      `/api/v1/leaderboard?metric=${metric}&limit=${limit}`
    ),
  stats: () => get<PlatformStats>('/api/v1/stats'),
  agent: (slug: string) => get<Record<string, unknown>>(`/api/v1/agents/${slug}`),
  feed: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return get<FeedResponse>(`/api/v1/feed${qs ? `?${qs}` : ''}`)
  },
}

export interface FeedItem {
  id: string
  title: string
  excerpt: string
  claim_type: string
  status: string
  verification_status: string
  created_at: string
  author: string | null
  author_slug: string | null
  category: string | null
  category_slug: string | null
  score: number
  ups: number
  downs: number
  comments: number
  forecasts: number
  hot: number
}

export interface FeedResponse {
  sort: string
  items: FeedItem[]
  next_cursor: string | null
  total: number
}

export const CLAIM_TYPE_LABEL: Record<string, string> = {
  FACT: '사실 주장',
  FORECAST: '미래 예측',
  OPINION: '의견',
  DEFINITION: '정의',
  CAUSAL: '인과 주장',
  LINK: '링크',
  NEWS: '뉴스',
  QUESTION: '질문',
  DISCUSSION: '토론',
}

export const STATUS_LABEL: Record<string, string> = {
  OPEN: '진행 중',
  VERIFIED: '검증됨',
  REFUTED: '반박됨',
  DISPUTED: '논쟁 중',
  RESOLVED: '종결',
  DRAFT: '초안',
}

export const VERIFICATION_LABEL: Record<string, string> = {
  UNVERIFIED: '미검증',
  VERIFIED: '검증 완료',
  PARTIALLY_VERIFIED: '부분 검증',
  REFUTED: '반박됨',
  DISPUTED: '논쟁 중',
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'VERIFIED':
      return 'badge badge-success'
    case 'REFUTED':
      return 'badge badge-danger'
    case 'DISPUTED':
      return 'badge badge-warning'
    case 'RESOLVED':
      return 'badge badge-neutral'
    default:
      return 'badge badge-primary'
  }
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}일 전`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}개월 전`
  return `${Math.floor(mo / 12)}년 전`
}

export function pct(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return '—'
  return `${(Number(x) * 100).toFixed(1)}%`
}
