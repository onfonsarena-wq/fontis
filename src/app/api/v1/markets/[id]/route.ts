import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Extract API key from Authorization header (optional)
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
    
    // Get market details
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select(`
        id, title, resolution_criteria, resolution_source,
        opens_at, closes_at, status, outcome, category,
        sponsor_label, created_at, sponsor_id
      `)
      .eq('id', id)
      .single()
    
    if (marketError || !market) {
      return NextResponse.json(
        { error: 'market_not_found', message: '시장을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // Get aggregates
    const { data: aggregate } = await supabase
      .from('market_aggregates')
      .select('*')
      .eq('market_id', id)
      .single()
    
    // Get user's vote if authenticated
    let myVote = null
    if (agentId) {
      const { data: vote } = await supabase
        .from('votes')
        .select('probability, reasoning, updated_at')
        .eq('market_id', id)
        .eq('agent_id', agentId)
        .single()
      
      if (vote) {
        myVote = vote
      }
    }
    
    // Get vote distribution (histogram)
    const { data: votes } = await supabase
      .from('votes')
      .select('probability')
      .eq('market_id', id)
    
    let votesDistribution: { probability: number; count: number }[] = []
    if (votes && votes.length > 0) {
      const bins = 10
      const binSize = 1 / bins
      const distribution = Array(bins).fill(0)
      
      votes.forEach(v => {
        const binIndex = Math.min(Math.floor(v.probability / binSize), bins - 1)
        distribution[binIndex]++
      })
      
      votesDistribution = distribution.map((count, i) => ({
        probability: i * binSize,
        count,
      })).filter(d => d.count > 0)
    }
    
    // Get agent votes (only if market is closed/resolved)
    let agentVotes = null
    const isClosed = market.status === 'closed' || market.status === 'resolved' || market.status === 'voided'
    const isPastClosesAt = new Date(market.closes_at).getTime() <= Date.now()
    
    if (isClosed || isPastClosesAt) {
      const { data: allVotes } = await supabase
        .from('votes')
        .select(`
          probability, reasoning, submitted_at:created_at,
          agent:agents!inner(name)
        `)
        .eq('market_id', id)
        .order('created_at', { ascending: true })
      
      if (allVotes) {
        agentVotes = allVotes.map(v => ({
          agent_name: v.agent?.[0]?.name || 'Unknown',
          probability: v.probability,
          reasoning: v.reasoning,
          submitted_at: v.submitted_at,
        }))
      }
    }
    
    return NextResponse.json({
      ...market,
      yes_votes: aggregate?.yes_votes || 0,
      no_votes: aggregate?.no_votes || 0,
      total_votes: aggregate?.total_votes || 0,
      avg_probability: aggregate?.avg_probability || 0.5,
      votes_distribution: votesDistribution,
      agent_votes: agentVotes,
      my_vote: myVote,
    })
    
  } catch (error) {
    console.error('Market detail error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}