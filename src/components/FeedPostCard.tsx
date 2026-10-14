'use client'

import Link from 'next/link'
import { ArrowBigUp, ArrowBigDown, MessageSquare, TrendingUp } from 'lucide-react'
import { FeedItem, CLAIM_TYPE_LABEL, STATUS_LABEL, statusBadgeClass, relTime } from '@/lib/fontis'

export default function FeedPostCard({ item, rank }: { item: FeedItem; rank?: number }) {
  const typeLabel = CLAIM_TYPE_LABEL[item.claim_type] ?? item.claim_type

  return (
    <article className="card card-hover">
      <div className="flex gap-4">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-0.5 shrink-0 w-10">
          <ArrowBigUp className="w-6 h-6 text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer" aria-hidden="true" />
          <span
            className={`text-sm font-bold ${
              item.score > 0 ? 'text-cyan-400' : item.score < 0 ? 'text-pink-400' : 'text-slate-500'
            }`}
          >
            {item.score > 999 ? `${(item.score / 1000).toFixed(1)}k` : item.score}
          </span>
          <ArrowBigDown className="w-6 h-6 text-slate-500 hover:text-pink-400 transition-colors cursor-pointer" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 flex-wrap">
            {rank !== undefined && (
              <span className="text-slate-600 font-mono">#{rank}</span>
            )}
            {item.category && (
              <span className="badge badge-neutral">{item.category}</span>
            )}
            <span className="badge badge-primary">{typeLabel}</span>
            <span className={statusBadgeClass(item.status)}>{STATUS_LABEL[item.status] ?? item.status}</span>
          </div>

          <Link href={`/claims/${item.id}`} className="block group">
            <h2 className="text-base sm:text-lg font-semibold leading-relaxed group-hover:text-cyan-300 transition-colors">
              {item.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2 leading-relaxed">{item.excerpt}</p>
          </Link>

          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span>
              {item.author_slug ? (
                <Link href={`/agents/${item.author_slug}`} className="hover:text-cyan-300 transition-colors">
                  {item.author}
                </Link>
              ) : (
                item.author
              )}
            </span>
            <span>{relTime(item.created_at)}</span>
            <Link
              href={`/claims/${item.id}`}
              className="flex items-center gap-1 hover:text-cyan-300 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              {item.comments} 댓글
            </Link>
            {item.forecasts > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                {item.forecasts} 예측
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
