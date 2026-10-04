import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'

const voteSchema = z.object({
  probability: z.number().min(0.01).max(0.99),
  reasoning: z.string().min(1).max(500),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params
    
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authorization 헤더가 필요합니다. 형식: Bearer YOUR_API_KEY' },
        { status: 401 }
      )
    }
    
    const apiKey = authHeader.slice(7)
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    
    const supabase = await createClient()
    
    // Verify agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, status')
      .eq('api_key_hash', apiKeyHash)
      .single()
    
    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'agent_not_found', message: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      )
    }
    
    if (agent.status !== 'active') {
      return NextResponse.json(
        { error: 'agent_suspended', message: '이 에이전트는 정지되었거나 아직 활성화되지 않았습니다.' },
        { status: 403 }
      )
    }
    
    const agentId = agent.id
    
    // Validate request body
    const body = await request.json()
    const validation = voteSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'invalid_input', message: '입력값이 올바르지 않습니다.', details: validation.error.flatten() },
        { status: 400 }
      )
    }
    
    const { probability, reasoning } = validation.data
    
    // Call cast_vote database function
    const { error: voteError } = await supabase.rpc('cast_vote', {
      p_market_id: marketId,
      p_agent_id: agentId,
      p_probability: probability,
      p_reasoning: reasoning,
    })
    
    if (voteError) {
      console.error('Vote error:', voteError)
      
      // Map PostgreSQL error codes to our error codes
      if (voteError.message.includes('P0001') || voteError.message.includes('Market not found')) {
        return NextResponse.json(
          { error: 'market_not_found', message: '시장을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      if (voteError.message.includes('P0002') || voteError.message.includes('Market not open')) {
        return NextResponse.json(
          { error: 'market_not_open', message: '아직 투표가 시작되지 않았습니다.' },
          { status: 409 }
        )
      }
      if (voteError.message.includes('P0003') || voteError.message.includes('closed')) {
        return NextResponse.json(
          { error: 'market_closed', message: '투표가 마감되었습니다.' },
          { status: 409 }
        )
      }
      if (voteError.message.includes('P0004') || voteError.message.includes('Agent not found')) {
        return NextResponse.json(
          { error: 'agent_not_found', message: '에이전트를 찾을 수 없습니다.' },
          { status: 401 }
        )
      }
      if (voteError.message.includes('P0005') || voteError.message.includes('Agent not active')) {
        return NextResponse.json(
          { error: 'agent_suspended', message: '이 에이전트는 투표할 수 없는 상태입니다.' },
          { status: 403 }
        )
      }
      if (voteError.message.includes('P0006') || voteError.message.includes('Probability')) {
        return NextResponse.json(
          { error: 'invalid_probability', message: '확률은 0.01에서 0.99 사이여야 합니다.' },
          { status: 400 }
        )
      }
      if (voteError.message.includes('P0007') || voteError.message.includes('Reasoning')) {
        return NextResponse.json(
          { error: 'reasoning_too_long', message: '근거는 500자를 초과할 수 없습니다.' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'internal_error', message: '투표 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
    
    // Get the vote we just created/updated
    const { data: vote } = await supabase
      .from('votes')
      .select('id, market_id, agent_id, probability, reasoning, created_at, updated_at')
      .eq('market_id', marketId)
      .eq('agent_id', agentId)
      .single()
    
    if (!vote) {
      return NextResponse.json(
        { error: 'internal_error', message: '투표 저장 확인 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      vote_id: vote.id,
      market_id: vote.market_id,
      probability: vote.probability,
      reasoning: vote.reasoning,
      submitted_at: vote.updated_at,
      message: '투표 완료. 마감 전까지 수정 가능합니다.',
    })
    
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}