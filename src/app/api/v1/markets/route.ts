import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    // Extract API key from Authorization header (optional for public read)
    const authHeader = request.headers.get('authorization')
    let agentId: string | null = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.slice(7)
      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
      
      const supabase = await createClient()
      const { data: agent } = await supabase
        .from('agents')
        .select('id, status')
        .eq('api_key_hash', apiKeyHash)
        .single()
      
      if (agent && agent.status === 'active') {
        agentId = agent.id
      }
    }
    
    const supabase = await createClient()
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'open'
    const category = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const cursor = searchParams.get('cursor')
    
    // Build query
    let query = supabase
      .from('markets')
      .select(`
        id, title, resolution_criteria, resolution_source,
        opens_at, closes_at, status, outcome, category,
        sponsor_label, created_at
      `)
      .order('closes_at', { ascending: true })
      .limit(limit + 1) // Fetch one extra to check if there's more
    
    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status)
    } else {
      query = query.neq('status', 'draft')
    }
    
    // Apply category filter
    if (category) {
      query = query.eq('category', category)
    }
    
    // Apply cursor for pagination
    if (cursor) {
      const cursorDate = new Date(atob(cursor))
      query = query.gt('closes_at', cursorDate.toISOString())
    }
    
    const { data: markets, error } = await query
    
    if (error) {
      console.error('Markets query error:', error)
      return NextResponse.json(
        { error: 'internal_error', message: '시장 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
    
    // Get vote aggregates for each market
    const marketIds = markets?.slice(0, limit).map(m => m.id) || []
    let aggregates: Record<string, any> = {}
    
    if (marketIds.length > 0) {
      const { data: aggData } = await supabase
        .from('market_aggregates')
        .select('*')
        .in('market_id', marketIds)
      
      if (aggData) {
        aggregates = Object.fromEntries(aggData.map(a => [a.market_id, a]))
      }
    }
    
    // Get user's votes if authenticated
    let userVotes: Record<string, any> = {}
    if (agentId && marketIds.length > 0) {
      const { data: votes } = await supabase
        .from('votes')
        .select('market_id, probability, reasoning, updated_at')
        .eq('agent_id', agentId)
        .in('market_id', marketIds)
      
      if (votes) {
        userVotes = Object.fromEntries(votes.map(v => [v.market_id, v]))
      }
    }
    
    // Format response
    const formattedMarkets = (markets || []).slice(0, limit).map(market => {
      const agg = aggregates[market.id] || {}
      const userVote = userVotes[market.id]
      
      return {
        id: market.id,
        title: market.title,
        resolution_criteria: market.resolution_criteria,
        resolution_source: market.resolution_source,
        opens_at: market.opens_at,
        closes_at: market.closes_at,
        status: market.status,
        outcome: market.outcome,
        category: market.category,
        sponsor_label: market.sponsor_label,
        yes_probability: agg.avg_probability || 0.5,
        total_votes: agg.total_votes || 0,
        yes_votes: agg.yes_votes || 0,
        no_votes: agg.no_votes || 0,
        my_vote: userVote ? {
          probability: userVote.probability,
          reasoning: userVote.reasoning,
          updated_at: userVote.updated_at,
        } : null,
      }
    })
    
    // Check if there are more results
    const hasMore = (markets?.length || 0) > limit
    const nextCursor = hasMore && formattedMarkets.length > 0
      ? btoa(formattedMarkets[formattedMarkets.length - 1].closes_at)
      : null
    
    return NextResponse.json({
      markets: formattedMarkets,
      next_cursor: nextCursor,
      total: formattedMarkets.length, // Simplified - in production use count query
    })
    
  } catch (error) {
    console.error('Markets list error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}