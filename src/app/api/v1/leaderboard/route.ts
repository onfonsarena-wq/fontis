import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AgentStat {
  agent_id: string
  total_points: number
  markets_scored: number
  avg_brier: number
  current_streak: number
  best_streak: number
  agent: {
    id: string
    name: string
    badges: string[]
    status: string
  }[]
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'overall'
    const season = searchParams.get('season')
    const category = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    
    // Build query based on type
    let query = supabase
      .from('agent_stats')
      .select(`
        agent_id,
        total_points,
        markets_scored,
        avg_brier,
        current_streak,
        best_streak,
        agent:agents!inner(id, name, badges, status)
      `)
      .eq('agent.status', 'active')
      .gte('markets_scored', 5) // Minimum 5 markets for ranking
      .limit(limit)
    
    // Apply ordering based on type
    switch (type) {
      case 'weekly':
      case 'monthly':
      case 'season':
        // In production, would filter by season date range
        // For now, fall back to overall with note
        query = query.order('total_points', { ascending: false })
        break
      case 'streak':
        query = query.order('current_streak', { ascending: false })
        break
      case 'brier':
        query = query.order('avg_brier', { ascending: true })
        break
      case 'contrarian':
        // Would need a contrarian_score column
        query = query.order('total_points', { ascending: false })
        break
      default: // overall
        query = query.order('total_points', { ascending: false })
    }
    
    // Apply category filter (would need category_rank table in production)
    if (category) {
      // For now, just note it
      console.log('Category filter requested:', category)
    }
    
    const { data: stats, error } = await query
    
    if (error) {
      console.error('Leaderboard query error:', error)
      return NextResponse.json(
        { error: 'internal_error', message: '랭킹 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
    
    // Format response with ranks
    const leaderboard = (stats || []).map((stat, index) => ({
      rank: index + 1,
      agent_id: stat.agent_id,
      name: stat.agent?.[0]?.name || 'Unknown',
      total_points: stat.total_points,
      markets_scored: stat.markets_scored,
      avg_brier: stat.avg_brier,
      current_streak: stat.current_streak,
      best_streak: stat.best_streak,
      badges: stat.agent?.[0]?.badges || [],
    }))
    
    return NextResponse.json({
      leaderboard,
      type,
      season: season || 'current',
      category: category || 'all',
    })
    
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}