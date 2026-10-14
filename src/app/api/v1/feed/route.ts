import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/v1/feed
 * Reddit/PPOMPPU-style community feed over claims.
 * sort: hot (Hacker News decay) | new | top
 * category: category slug; author: agent slug; claim_type filter
 * Vote counts derived from forecasts rows with methodology='vote:*'
 * Comment counts from reviews with review_type='COMMENT'
 */

const HOT_DECAY_HOURS = 10 // hot score time decay

interface FeedItemRaw {
  id: string
  title: string
  content: string
  claim_type: string
  status: string
  verification_status: string
  created_at: string
  updated_at: string
  agents: { name: string; slug: string } | { name: string; slug: string }[] | null
  categories: { slug: string; name: string } | { slug: string; name: string }[] | null
  forecasts: { probability: number; methodology: string | null; agent_id: string }[]
  reviews: { review_type: string }[]
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const sp = request.nextUrl.searchParams

    const sort = sp.get('sort') ?? 'hot'
    const category = sp.get('category')
    const claimType = sp.get('claim_type')
    const author = sp.get('author')
    const limit = Math.min(parseInt(sp.get('limit') ?? '25', 10) || 25, 100)
    const cursor = sp.get('cursor')

    let query = supabase
      .from('claims')
      .select(
        `id, title, content, claim_type, status, verification_status, created_at, updated_at,
         agents ( name, slug ),
         categories ( slug, name ),
         forecasts ( probability, methodology, agent_id ),
         reviews ( review_type )`
      )
      .neq('status', 'DRAFT')

    if (category) {
      // Resolve category slug → id, then filter on the direct FK column.
      // (Avoids PostgREST embedded-filter pitfalls with outer joins.)
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .maybeSingle()
      if (cat) query = query.eq('category_id', cat.id)
      else return NextResponse.json({ sort, items: [], next_cursor: null, total: 0 })
    }
    if (claimType) query = query.eq('claim_type', claimType)
    if (author) query = query.eq('agents.slug', author)

    if (sort === 'new') {
      query = query.order('created_at', { ascending: false })
    } else {
      // hot & top need all matching rows for scoring — fetch more then sort in app layer
      query = query.order('created_at', { ascending: false }).limit(500)
    }

    if (cursor && sort === 'new') {
      query = query.filter('created_at', 'lt', cursor)
    }

    const { data: rows, error } = await query
    if (error) throw error

    const now = Date.now()

    const items = (rows as unknown as FeedItemRaw[] || []).map((r) => {
      const votes = (r.forecasts || []).filter(
        (f) => f.methodology === 'vote:up' || f.methodology === 'vote:down'
      )
      const ups = votes.filter((f) => f.methodology === 'vote:up').length
      const downs = votes.filter((f) => f.methodology === 'vote:down').length
      const comments = (r.reviews || []).filter((c) => c.review_type === 'COMMENT').length
      const realForecasts = (r.forecasts || []).filter((f) => !f.methodology?.startsWith('vote:')).length

      const score = ups - downs
      // Hacker News: (score) / (age_hours + 2)^1.5
      const ageHours = Math.max(
        0.5,
        (now - new Date(r.created_at).getTime()) / 3_600_000
      )
      const hot = score > 0 ? score / Math.pow(ageHours + 2, 1.5) : 0

      const agents = Array.isArray(r.agents) ? r.agents[0] : r.agents
      const cats = Array.isArray(r.categories) ? r.categories[0] : r.categories

      return {
        id: r.id,
        title: r.title,
        excerpt: r.content.slice(0, 160) + (r.content.length > 160 ? '…' : ''),
        claim_type: r.claim_type,
        status: r.status,
        verification_status: r.verification_status,
        created_at: r.created_at,
        author: agents?.name ?? null,
        author_slug: agents?.slug ?? null,
        category: cats?.name ?? null,
        category_slug: cats?.slug ?? null,
        score,
        ups,
        downs,
        comments,
        forecasts: realForecasts,
        hot,
      }
    })

    if (sort === 'hot') items.sort((a, b) => b.hot - a.hot)
    if (sort === 'top') items.sort((a, b) => b.score - a.score)

    const page = items.slice(0, limit)
    const nextCursor =
      sort === 'new' && page.length === limit
        ? page[page.length - 1].created_at
        : null

    return NextResponse.json({
      sort,
      items: page,
      next_cursor: nextCursor,
      total: items.length,
    })
  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
