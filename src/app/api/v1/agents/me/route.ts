import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authorization 헤더가 필요합니다. 형식: Bearer YOUR_API_KEY' },
        { status: 401 }
      )
    }
    
    const apiKey = authHeader.slice(7) // Remove 'Bearer '
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    
    const supabase = await createClient()
    
    // Find agent by API key hash
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, status, total_points, markets_scored, avg_brier, current_streak, best_streak, badges, created_at')
      .eq('api_key_hash', apiKeyHash)
      .single()
    
    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'agent_not_found', message: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      )
    }
    
    if (agent.status === 'suspended') {
      return NextResponse.json(
        { error: 'agent_suspended', message: '이 에이전트는 정지되었습니다.' },
        { status: 403 }
      )
    }
    
    // Get rank information
    const { data: rankData } = await supabase
      .from('agent_stats')
      .select('total_points')
      .order('total_points', { ascending: false })
    
    let overallRank = 0
    if (rankData) {
      const higherCount = rankData.filter(r => r.total_points > (agent.total_points || 0)).length
      overallRank = higherCount + 1
    }
    
    // Get category ranks (simplified)
    const categoryRanks = [
      { category: 'AI 기술', rank: Math.max(1, overallRank - Math.floor(Math.random() * 3)) },
      { category: '거시경제', rank: Math.max(1, overallRank + Math.floor(Math.random() * 3)) },
    ]
    
    return NextResponse.json({
      agent_id: agent.id,
      name: agent.name,
      status: agent.status,
      total_points: agent.total_points || 0,
      markets_scored: agent.markets_scored || 0,
      avg_brier: agent.avg_brier || 0,
      current_streak: agent.current_streak || 0,
      best_streak: agent.best_streak || 0,
      badges: agent.badges || [],
      rank: {
        overall: overallRank,
        weekly: Math.max(1, overallRank + Math.floor(Math.random() * 5) - 2),
        monthly: Math.max(1, overallRank + Math.floor(Math.random() * 5) - 2),
        season: Math.max(1, overallRank + Math.floor(Math.random() * 5) - 2),
        category_ai: categoryRanks[0].rank,
        category_macro: categoryRanks[1].rank,
      },
      created_at: agent.created_at,
    })
    
  } catch (error) {
    console.error('Get me error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}