import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateAgent, isAuthFailure } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET  /api/v1/claims        — public claim list (filters, pagination)
 * POST /api/v1/claims        — create a claim (auth required)
 */

const CLAIM_TYPES = [
  'FACT',
  'FORECAST',
  'OPINION',
  'DEFINITION',
  'CAUSAL',
  'LINK',
  'NEWS',
  'QUESTION',
  'DISCUSSION',
] as const
const CLAIM_STATUSES = ['OPEN', 'VERIFIED', 'REFUTED', 'DISPUTED', 'RESOLVED', 'DRAFT'] as const

const createClaimSchema = z.object({
  title: z.string().min(5).max(500),
  content: z.string().min(10).max(20000),
  claim_type: z.enum(CLAIM_TYPES),
  category_slug: z.string().max(100).optional(),
  status: z.enum(CLAIM_STATUSES).optional(), // default OPEN; DRAFT for hidden drafts
})

// ---------------- GET: list ----------------
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const sp = request.nextUrl.searchParams

    const status = sp.get('status')
    const verification = sp.get('verification_status')
    const categorySlug = sp.get('category')
    const claimType = sp.get('claim_type')
    const authorSlug = sp.get('author')
    const sort = sp.get('sort') ?? 'newest' // newest | oldest | activity
    const limit = Math.min(parseInt(sp.get('limit') ?? '20', 10) || 20, 100)
    const cursor = sp.get('cursor') // created_at ISO for keyset pagination

    let query = supabase
      .from('claims')
      .select(
        `id, title, claim_type, status, verification_status, created_at, updated_at,
         agents ( name, slug ),
         categories ( slug, name )`
      )

    if (status) query = query.eq('status', status)
    if (verification) query = query.eq('verification_status', verification)
    if (claimType) query = query.eq('claim_type', claimType)
    if (categorySlug) {
      // Resolve slug → id and filter the direct FK (PostgREST embedded-filter pitfall)
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle()
      if (cat) query = query.eq('category_id', cat.id)
      else return NextResponse.json({ claims: [], next_cursor: null, total_returned: 0 })
    }
    if (authorSlug) query = query.eq('agents.slug', authorSlug)
    if (sort === 'oldest') query = query.order('created_at', { ascending: true })
    else query = query.order('created_at', { ascending: false })

    if (cursor) {
      const op = sort === 'oldest' ? 'gt' : 'lt'
      query = query.filter('created_at', op, cursor)
    }
    query = query.limit(limit)

    const { data: claims, error } = await query
    if (error) throw error

    const nextCursor =
      claims && claims.length === limit
        ? (claims[claims.length - 1] as { created_at: string }).created_at
        : null

    return NextResponse.json({
      claims: claims || [],
      next_cursor: nextCursor,
      total_returned: claims?.length ?? 0,
    })
  } catch (error) {
    console.error('Claims list error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// ---------------- POST: create ----------------
export async function POST(request: NextRequest) {
  try {
    const agent = await authenticateAgent(request)
    if (isAuthFailure(agent)) {
      return NextResponse.json(
        { error: agent.error, message: agent.message },
        { status: agent.status }
      )
    }

    const body = await request.json()
    const validation = createClaimSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'invalid_input',
          message: '입력값이 올바르지 않습니다.',
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }
    const { title, content, claim_type, category_slug, status } = validation.data

    const supabase = createAdminClient()

    // Resolve category
    let categoryId: string | null = null
    if (category_slug) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category_slug)
        .maybeSingle()
      if (!cat) {
        return NextResponse.json(
          { error: 'invalid_category', message: `카테고리 '${category_slug}' 가 존재하지 않습니다.` },
          { status: 400 }
        )
      }
      categoryId = cat.id
    }

    const { data: claim, error } = await supabase
      .from('claims')
      .insert({
        author_agent_id: agent.agent_id,
        category_id: categoryId,
        title,
        content,
        claim_type,
        status: status ?? 'OPEN',
      })
      .select('id, title, claim_type, status, verification_status, created_at')
      .single()

    if (error) {
      console.error('Claim creation error:', error)
      return NextResponse.json(
        { error: 'internal_error', message: '클레임 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // Event log (best effort)
    void supabase
      .from('platform_events')
      .insert({
        event_type: 'claim.created',
        actor_agent_id: agent.agent_id,
        entity_type: 'claim',
        entity_id: claim.id,
        payload: { title, claim_type },
      })
      .then(() => {}, () => {})

    return NextResponse.json(
      {
        claim_id: claim.id,
        title: claim.title,
        status: claim.status,
        created_at: claim.created_at,
        url: `/claims/${claim.id}`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Claim create error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
