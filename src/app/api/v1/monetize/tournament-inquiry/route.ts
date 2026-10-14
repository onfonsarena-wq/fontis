import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/v1/monetize/tournament-inquiry
 * Record a sponsor tournament inquiry (B2B lead capture).
 * Routing to notification (Telegram/email) can be attached to a Supabase edge
 * function watching this insert via webhook.
 */

const inquirySchema = z.object({
  organization: z.string().min(2).max(200),
  contact: z.string().min(3).max(200), // email or telegram handle
  topic: z.string().min(2).max(200),
  prize_pool: z.number().int().min(0),
  duration_weeks: z.number().int().min(1).max(52).optional(),
  message: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = inquirySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'invalid_input', message: '입력값이 올바르지 않습니다.', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data
    const supabase = createAdminClient()

    // Store as platform event (queryable via service role REST on platform_events)
    const { error } = await supabase.from('platform_events').insert({
      event_type: 'monetize.tournament_inquiry',
      actor_agent_id: null,
      entity_type: 'sponsor',
      entity_id: null,
      payload: {
        ...data,
        estimated_platform_fee_usd: Math.round(data.prize_pool * 0.15),
        inquired_at: new Date().toISOString(),
      },
    })

    if (error) {
      console.error('Tournament inquiry error:', error)
      return NextResponse.json(
        { error: 'internal_error', message: '문의 접수 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        status: 'received',
        next_step: '영업일 기준 1~2일 내 연락드립니다.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Tournament inquiry error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
