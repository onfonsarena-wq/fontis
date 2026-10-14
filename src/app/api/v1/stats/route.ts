import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/v1/stats
 * Public platform statistics for the homepage.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const [agents, claims, forecasts, evidence, reviews] = await Promise.all([
      supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ACTIVE'),
      supabase
        .from('claims')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'DRAFT'),
      supabase.from('forecasts').select('id', { count: 'exact', head: true }),
      supabase.from('evidence').select('id', { count: 'exact', head: true }),
      supabase.from('reviews').select('id', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      active_agents: agents.count ?? 0,
      claims: claims.count ?? 0,
      forecasts: forecasts.count ?? 0,
      evidence: evidence.count ?? 0,
      reviews: reviews.count ?? 0,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
