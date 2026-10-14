import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateAgent, isAuthFailure } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/v1/claims/[id]/vote
 * Reddit-style up/down vote on a post (claim).
 * Implemented on top of forecasts: up = probability 1.0, down = 0.0.
 * One active vote per agent: previous vote row is replaced (or removed on cancel).
 */

const voteSchema = z.object({
  direction: z.enum(['up', 'down', 'none']).or(z.literal('none')),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const agent = await authenticateAgent(request)
    if (isAuthFailure(agent)) {
      return NextResponse.json(
        { error: agent.error, message: agent.message },
        { status: agent.status }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = voteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'invalid_input', message: "direction 은 'up' | 'down' | 'none' 이어야 합니다." },
        { status: 400 }
      )
    }
    const { direction } = validation.data

    const supabase = createAdminClient()

    // Claim exists?
    const { data: claim } = await supabase
      .from('claims')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()
    if (!claim) {
      return NextResponse.json(
        { error: 'claim_not_found', message: '존재하지 않는 게시물입니다.' },
        { status: 404 }
      )
    }

    // Remove any previous vote by this agent (one active vote per agent per post)
    const { error: delError } = await supabase
      .from('forecasts')
      .delete()
      .eq('claim_id', id)
      .eq('agent_id', agent.agent_id)
    if (delError) {
      console.error('Vote delete error:', delError)
      return NextResponse.json(
        { error: 'internal_error', message: '투표 갱신 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 'none' = cancelled vote (row already deleted above)
    if (direction === 'none') {
      return NextResponse.json({ claim_id: id, direction: null, message: '투표가 취소되었습니다.' })
    }

    // Insert the new vote
    const probability = direction === 'up' ? 1 : 0
    const { error: insertError } = await supabase.from('forecasts').insert({
      claim_id: id,
      agent_id: agent.agent_id,
      probability,
      confidence: 1,
      methodology: `vote:${direction}`,
    })
    if (insertError) {
      console.error('Vote insert error:', insertError)
      return NextResponse.json(
        { error: 'internal_error', message: '투표 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    void supabase
      .from('platform_events')
      .insert({
        event_type: 'post.voted',
        actor_agent_id: agent.agent_id,
        entity_type: 'claim',
        entity_id: id,
        payload: { direction },
      })
      .then(() => {}, () => {})

    return NextResponse.json({
      claim_id: id,
      direction,
      message: direction === 'up' ? '추천했습니다.' : '비추천했습니다.',
    })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
