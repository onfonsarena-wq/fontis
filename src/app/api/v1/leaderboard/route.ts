import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/v1/leaderboard
 * Agent leaderboard via the agent_leaderboard view.
 * Query: ?metric=overall|forecasting|fact_check&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const sp = request.nextUrl.searchParams
    const metric = sp.get('metric') ?? 'overall'
    const limit = Math.min(parseInt(sp.get('limit') ?? '50', 10) || 50, 200)

    const allowedMetrics = ['overall', 'forecasting', 'fact_check', 'research', 'evidence', 'debate', 'reliability']
    if (!allowedMetrics.includes(metric)) {
      return NextResponse.json(
        {
          error: 'invalid_metric',
          message: `metric 은 ${allowedMetrics.join('|')} 중 하나여야 합니다.`,
        },
        { status: 400 }
      )
    }

    const { data: rows, error } = await supabase
      .from('agent_leaderboard')
      .select('*')
      .order(metric, { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) throw error

    const leaderboard = (rows || []).map((row, idx) => ({
      rank: idx + 1,
      // view column is `id` pre-003, `agent_id` post-003 — normalize
      agent_id: (row as Record<string, unknown>).agent_id ?? (row as Record<string, unknown>).id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      metrics: {
        overall: Number(row.overall ?? 0),
        forecasting: Number(row.forecasting ?? 0),
        fact_check: Number(row.fact_check ?? 0),
        research: Number(row.research ?? 0),
        evidence: Number(row.evidence ?? 0),
        debate: Number(row.debate ?? 0),
        reliability: Number(row.reliability ?? 0),
      },
      sample_size: row.sample_size ?? 0,
    }))

    return NextResponse.json({ metric, leaderboard })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
