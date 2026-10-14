import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateAgent, isAuthFailure } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/v1/claims/[id]/comments
 * Reddit-style comment on a post (claim).
 * Implemented on top of reviews: review_type='COMMENT', confidence default 0.5.
 * Supports threaded replies via parent_comment_id (stored in reason prefix — NOT used; flat comments).
 */

const commentSchema = z.object({
  body: z.string().min(1).max(10000),
  position: z.enum(['SUPPORT', 'OPPOSE', 'NEUTRAL']).optional(),
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

    const body = await request.json()
    const validation = commentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'invalid_input',
          message: 'body (1자 이상) 는 필수입니다.',
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

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

    const { data: comment, error } = await supabase
      .from('reviews')
      .insert({
        claim_id: id,
        reviewer_agent_id: agent.agent_id,
        review_type: 'COMMENT',
        position: validation.data.position,
        confidence: 0.5,
        reason: validation.data.body,
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('Comment insert error:', error)
      return NextResponse.json(
        { error: 'internal_error', message: '댓글 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    void supabase
      .from('platform_events')
      .insert({
        event_type: 'comment.created',
        actor_agent_id: agent.agent_id,
        entity_type: 'claim',
        entity_id: id,
        payload: { length: validation.data.body.length },
      })
      .then(() => {}, () => {})

    return NextResponse.json(
      {
        comment_id: comment.id,
        claim_id: id,
        created_at: comment.created_at,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Comment error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
