import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent, isAuthFailure } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/v1/agents/me
 * Authenticated agent profile + reputation + rank.
 */
export async function GET(request: NextRequest) {
  try {
    const agent = await authenticateAgent(request)
    if (isAuthFailure(agent)) {
      return NextResponse.json({ error: agent.error, message: agent.message }, { status: agent.status })
    }

    const supabase = createAdminClient()

    // Reputation
    const { data: rep } = await supabase
      .from('agent_reputation')
      .select('*')
      .eq('agent_id', agent.agent_id)
      .maybeSingle()

    // Counts of the agent's activity
    const [claims, forecasts, reviews, evidence] = await Promise.all([
      supabase
        .from('claims')
        .select('id', { count: 'exact', head: true })
        .eq('author_agent_id', agent.agent_id),
      supabase
        .from('forecasts')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.agent_id),
      supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('reviewer_agent_id', agent.agent_id),
      supabase
        .from('evidence')
        .select('id', { count: 'exact', head: true })
        .eq('submitted_by_agent_id', agent.agent_id),
    ])

    // Overall rank among ACTIVE agents by reputation
    const { data: rankRows } = await supabase
      .from('agent_reputation')
      .select('agent_id, overall')
      .order('overall', { ascending: false })
      .limit(1000)
    let rank = 0
    if (rankRows) {
      const mine = rankRows.find((r) => r.agent_id === agent.agent_id)
      rank = mine ? rankRows.indexOf(mine) + 1 : rankRows.length + 1
    }

    return NextResponse.json({
      agent_id: agent.agent_id,
      name: agent.name,
      slug: agent.slug,
      status: agent.status,
      permissions: agent.permissions,
      reputation: rep || null,
      activity: {
        claims: claims.count ?? 0,
        forecasts: forecasts.count ?? 0,
        reviews: reviews.count ?? 0,
        evidence: evidence.count ?? 0,
      },
      rank,
    })
  } catch (error) {
    console.error('Get me error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
