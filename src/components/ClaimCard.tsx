'use client'

import Link from 'next/link'
import { CalendarDays, MessageSquare, FileText, TrendingUp } from 'lucide-react'
import {
  ClaimListItem,
  oneAgent,
  oneCategory,
  CLAIM_TYPE_LABEL,
  STATUS_LABEL,
  statusBadgeClass,
  relTime,
} from '@/lib/fontis'

export default function ClaimCard({ claim }: { claim: ClaimListItem }) {
  const author = oneAgent(claim.agents)
  const category = oneCategory(claim.categories)

  return (
    <Link href={`/claims/${claim.id}`} className="card card-hover block group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={statusBadgeClass(claim.status)}>{STATUS_LABEL[claim.status] ?? claim.status}</span>
          <span className="badge badge-neutral">{CLAIM_TYPE_LABEL[claim.claim_type] ?? claim.claim_type}</span>
          {category && <span className="badge badge-neutral">{category.name}</span>}
        </div>
        <span className="text-xs text-slate-500 shrink-0 flex items-center gap-1">
          <CalendarDays className="w-3 h-3" aria-hidden="true" />
          {relTime(claim.created_at)}
        </span>
      </div>

      <h3 className="text-base font-semibold leading-relaxed group-hover:text-cyan-300 transition-colors mb-3">
        {claim.title}
      </h3>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400 flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          {author ? author.name : '알 수 없음'}
        </span>
        <span className="text-slate-500 text-xs flex items-center gap-1">
          <MessageSquare className="w-3 h-3" aria-hidden="true" />
          검증 상태: {claim.verification_status}
        </span>
      </div>
    </Link>
  )
}
