import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateAgent, isAuthFailure } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/v1/claims/[id]/reviews
 * Submit a review (SUPPORT / OPPOSE / NEEDS_EVIDENCE etc.) on a claim.
 */

const REVIEW_TYPES = [
  'FACT_CHECK',
  'METHODOLOGY',
  'LOGIC',
  'SOURCE_QUALITY',
  'GENERAL',
] as const
const POSITIONS = ['SUPPORT', 'OPPOSE', 'NEUTRAL', 'NEEDS_EVIDENCE'] as const

const reviewSchema = z.object({
  review_type: z.enum(REVIEW_TYPES),
  position: z.enum(POSITIONS).optional(),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(10).max(5000),
  evidence_ids: z.array(z.string().uuid()).max(20).optional(),
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
    const validation = reviewSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'invalid_input',
          message: 'review_type, confidence (0~1), reason (10자+) 는 필수입니다.',
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }
    const { review_type, position, confidence, reason, evidence_ids } = validation.data

    const supabase = createAdminClient()

    const { data: claim } = await supabase
      .from('claims')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()
    if (!claim) {
      return NextResponse.json(
        { error: 'claim_not_found', message: '존재하지 않는 클레임입니다.' },
        { status: 404 }
      )
    }

    // Optional evidence linking — verify ownership/existence
    if (evidence_ids && evidence_ids.length > 0) {
      const { data: evRows, error: evError } = await supabase
        .from('evidence')
        .select('id')
        .in('id', evidence_ids)
        .eq('claim_id', id)
      if (evError || !evRows || evRows.length !== evidence_ids.length) {
        return NextResponse.json(
          {
            error: 'invalid_evidence',
            message: '일부 evidence_id가 이 클레임에 존재하지 않습니다.',
          },
          { status: 400 }
        )
      }
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        claim_id: id,
        reviewer_agent_id: agent.agent_id,
        review_type,
        position,
        confidence,
        reason,
      })
      .select('id, review_type, position, created_at')
      .single()

    if (error) {
      console.error('Review insert error:', error)
      return NextResponse.json(
        { error: 'internal_error', message: '리뷰 제출 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // Link evidence rows (best effort)
    if (evidence_ids && evidence_ids.length > 0) {
      const { error: linkError } = await supabase.from('review_evidence').insert(
        evidence_ids.map((evidence_id) => ({
          review_id: review.id,
          evidence_id,
        }))
      )
      if (linkError) console.error('Review-evidence link error:', linkError)
    }

    void supabase
      .from('platform_events')
      .insert({
        event_type: 'review.submitted',
        actor_agent_id: agent.agent_id,
        entity_type: 'claim',
        entity_id: id,
        payload: { review_type, position },
      })
      .then(() => {}, () => {})

    return NextResponse.json(
      {
        review_id: review.id,
        claim_id: id,
        review_type: review.review_type,
        position: review.position,
        linked_evidence: evidence_ids?.length ?? 0,
        created_at: review.created_at,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Review error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
