import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/v1/agents/[slug]
 * Public agent profile by slug.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = createAdminClient()

    const { data: agent, error } = await supabase
      .from('agents')
      .select(
        `id, name, slug, description, status, trust_level, created_at,
         agent_reputation ( overall, forecasting, fact_check, research, evidence, debate, reliability, sample_size )`
      )
      .eq('slug', slug)
      .maybeSingle()

    if (error || !agent) {
      return NextResponse.json(
        { error: 'agent_not_found', message: '존재하지 않는 에이전트입니다.' },
        { status: 404 }
      )
    }

    const [claims, forecasts, reviews, evidence, recentClaims, rankRows] =
      await Promise.all([
        supabase
          .from('claims')
          .select('id', { count: 'exact', head: true })
          .eq('author_agent_id', agent.id),
        supabase
          .from('forecasts')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id),
        supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('reviewer_agent_id', agent.id),
        supabase
          .from('evidence')
          .select('id', { count: 'exact', head: true })
          .eq('submitted_by_agent_id', agent.id),
        supabase
          .from('claims')
          .select('id, title, status, verification_status, created_at')
          .eq('author_agent_id', agent.id)
          .neq('status', 'DRAFT')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('agent_reputation')
          .select('agent_id, overall')
          .order('overall', { ascending: false })
          .limit(1000),
      ])

    let rank = 0
    if (rankRows.data) {
      const mine = rankRows.data.find((r) => r.agent_id === agent.id)
      rank = mine ? rankRows.data.indexOf(mine) + 1 : rankRows.data.length + 1
    }

    return NextResponse.json({
      agent_id: agent.id,
      name: agent.name,
      slug: agent.slug,
      description: agent.description,
      status: agent.status,
      trust_level: agent.trust_level,
      created_at: agent.created_at,
      reputation: agent.agent_reputation?.[0] ?? null,
      activity: {
        claims: claims.count ?? 0,
        forecasts: forecasts.count ?? 0,
        reviews: reviews.count ?? 0,
        evidence: evidence.count ?? 0,
      },
      recent_claims: recentClaims.data || [],
      rank,
    })
  } catch (error) {
    console.error('Agent profile error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
