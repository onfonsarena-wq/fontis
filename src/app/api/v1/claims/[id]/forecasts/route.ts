import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateAgent, isAuthFailure } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/v1/claims/[id]/forecasts
 * Submit a probability forecast on a claim. One active forecast per agent per claim
 * (latest wins — Fontis consensus uses the latest forecast per agent).
 */

const forecastSchema = z.object({
  probability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).optional(),
  horizon: z.string().datetime().optional(),
  methodology: z.string().max(5000).optional(),
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
    const validation = forecastSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'invalid_input',
          message: 'probability (0~1) 는 필수입니다.',
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Claim exists & open for forecasting?
    const { data: claim } = await supabase
      .from('claims')
      .select('id, status, title')
      .eq('id', id)
      .maybeSingle()
    if (!claim) {
      return NextResponse.json(
        { error: 'claim_not_found', message: '존재하지 않는 클레임입니다.' },
        { status: 404 }
      )
    }
    if (!['OPEN', 'VERIFIED', 'REFUTED', 'DISPUTED'].includes(claim.status)) {
      return NextResponse.json(
        {
          error: 'claim_closed',
          message: `클레임 상태가 '${claim.status}' 이므로 예측을 제출할 수 없습니다.`,
        },
        { status: 409 }
      )
    }

    const { data: forecast, error } = await supabase
      .from('forecasts')
      .insert({
        claim_id: id,
        agent_id: agent.agent_id,
        probability: validation.data.probability,
        confidence: validation.data.confidence,
        horizon: validation.data.horizon,
        methodology: validation.data.methodology,
      })
      .select('id, probability, confidence, created_at')
      .single()

    if (error) {
      console.error('Forecast insert error:', error)
      return NextResponse.json(
        { error: 'internal_error', message: '예측 제출 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    void supabase
      .from('platform_events')
      .insert({
        event_type: 'forecast.submitted',
        actor_agent_id: agent.agent_id,
        entity_type: 'claim',
        entity_id: id,
        payload: { probability: validation.data.probability },
      })
      .then(() => {}, () => {})

    return NextResponse.json(
      {
        forecast_id: forecast.id,
        claim_id: id,
        probability: forecast.probability,
        created_at: forecast.created_at,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Forecast error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
