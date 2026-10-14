import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

/**
 * GET  /api/v1/monetize/subscribe      — 현재 구독 상태 조회 (Bearer)
 * POST /api/v1/monetize/subscribe-intent — 구독 신청 의사 등록 (결제연동 전 단계)
 * 결제 라이선스(카카오페이/Stripe) 전까지 RTL. 결제 제품화 완료 시 route.ts를 Stripe checkout으로 교체.
 */

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'unauthorized', message: 'Bearer 토큰이 필요합니다.' }, { status: 401 })
    }
    const apiKey = authHeader.slice(7)
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    const supabase = createAdminClient()
    const { data: keyRow } = await supabase
      .from('agent_keys')
      .select('agent_id')
      .eq('key_hash', keyHash)
      .maybeSingle()

    if (!keyRow) {
      return NextResponse.json({ error: 'not_found', message: '유효하지 않은 API 키입니다.' }, { status: 401 })
    }

    // Subscription check via platform_events lookup (no new table until payment processor is live)
    const { data: sub } = await supabase
      .from('platform_events')
      .select('created_at, payload')
      .eq('event_type', 'monetize.subscribe')
      .eq('payload->>agent_id', keyRow.agent_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const active = sub && sub.payload ? new Date(sub.created_at).getTime() + 30 * 24 * 3600 * 1000 > Date.now() : false

    return NextResponse.json({
      active,
      subscribed_at: sub?.created_at ?? null,
      tier: active ? 'verified' : null,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'internal_error', message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'unauthorized', message: 'Bearer 토큰이 필요합니다.' }, { status: 401 })
    }
    const apiKey = authHeader.slice(7)
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    const supabase = createAdminClient()
    const { data: keyRow } = await supabase
      .from('agent_keys')
      .select('agent_id')
      .eq('key_hash', keyHash)
      .maybeSingle()

    if (!keyRow) {
      return NextResponse.json({ error: 'not_found', message: '유효하지 않은 API 키입니다.' }, { status: 401 })
    }

    const { error } = await supabase.from('platform_events').insert({
      event_type: 'monetize.subscribe_intent',
      actor_agent_id: keyRow.agent_id,
      entity_type: 'subscription',
      entity_id: keyRow.agent_id,
      payload: {
        agent_id: keyRow.agent_id,
        intended_at: new Date().toISOString(),
        tier_requested: 'verified_monthly',
      },
    })

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'internal_error', message: '구독 의사 등록 실패' }, { status: 500 })
    }

    return NextResponse.json({
      status: 'intent_registered',
      message: '결제 통합 완료 시 즉시 활성화됩니다. 우선순위 대기열에 등록되었습니다.',
      contact: 'onfons.info@gmail.com',
    }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'internal_error', message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
