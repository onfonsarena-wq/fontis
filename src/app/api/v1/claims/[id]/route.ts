import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateAgent, isAuthFailure } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET   /api/v1/claims/[id]  — claim detail + consensus + recent activity
 * PATCH /api/v1/claims/[id]  — author edit (creates a claim_version snapshot)
 */

// ---------------- GET: detail ----------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: claim, error } = await supabase
      .from('claims')
      .select(
        `id, title, content, claim_type, status, verification_status, created_at, updated_at, resolved_at,
         agents ( id, name, slug, trust_level ),
         categories ( id, slug, name )`
      )
      .eq('id', id)
      .maybeSingle()

    if (error || !claim) {
      return NextResponse.json(
        { error: 'claim_not_found', message: '존재하지 않는 클레임입니다.' },
        { status: 404 }
      )
    }

    const [consensus, forecasts, evidence, reviews] = await Promise.all([
      supabase.from('claim_consensus').select('*').eq('claim_id', id).maybeSingle(),
      supabase
        .from('forecasts')
        .select(
          `id, probability, confidence, horizon, methodology, created_at,
           agents ( name, slug )`
        )
        .eq('claim_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('evidence')
        .select(
          `id, evidence_type, relation, excerpt, confidence, created_at,
           agents ( name, slug ),
           sources ( publisher, title, url )`
        )
        .eq('claim_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('reviews')
        .select(
          `id, review_type, position, confidence, reason, created_at,
           agents ( name, slug )`
        )
        .eq('claim_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    return NextResponse.json({
      claim,
      consensus: consensus.data || null,
      forecasts: forecasts.data || [],
      evidence: evidence.data || [],
      reviews: reviews.data || [],
      counts: {
        forecasts: forecasts.data?.length ?? 0,
        evidence: evidence.data?.length ?? 0,
        reviews: reviews.data?.length ?? 0,
      },
    })
  } catch (error) {
    console.error('Claim detail error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// ---------------- PATCH: author edit ----------------
const patchClaimSchema = z.object({
  title: z.string().min(5).max(500).optional(),
  content: z.string().min(10).max(20000).optional(),
  change_reason: z.string().max(2000).optional(),
})

export async function PATCH(
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
    const validation = patchClaimSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'invalid_input',
          message: '입력값이 올바르지 않습니다.',
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Load current claim
    const { data: claim, error: loadError } = await supabase
      .from('claims')
      .select('id, title, content, author_agent_id, status')
      .eq('id', id)
      .maybeSingle()

    if (loadError || !claim) {
      return NextResponse.json(
        { error: 'claim_not_found', message: '존재하지 않는 클레임입니다.' },
        { status: 404 }
      )
    }
    if (claim.author_agent_id !== agent.agent_id) {
      return NextResponse.json(
        { error: 'forbidden', message: '클레임 작성자만 수정할 수 있습니다.' },
        { status: 403 }
      )
    }

    const { title, content, change_reason } = validation.data
    if (!title && !content) {
      return NextResponse.json(
        { error: 'invalid_input', message: 'title 또는 content 중 하나는 필요합니다.' },
        { status: 400 }
      )
    }

    // Next version number
    const { data: lastVersion } = await supabase
      .from('claim_versions')
      .select('version_no')
      .eq('claim_id', id)
      .order('version_no', { ascending: false })
      .limit(1)
    const nextVersion = (lastVersion?.[0]?.version_no ?? 0) + 1

    // Snapshot the OLD state as a version row
    const { error: versionError } = await supabase.from('claim_versions').insert({
      claim_id: id,
      version_no: nextVersion,
      title: claim.title,
      content: claim.content,
      change_reason: change_reason ?? null,
      created_by_agent_id: agent.agent_id,
    })
    if (versionError) {
      console.error('Version snapshot error:', versionError)
      return NextResponse.json(
        { error: 'internal_error', message: '버전 스냅샷 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // Apply the update
    const { data: updated, error: updateError } = await supabase
      .from('claims')
      .update({
        ...(title ? { title } : {}),
        ...(content ? { content } : {}),
      })
      .eq('id', id)
      .select('id, title, status, updated_at')
      .single()

    if (updateError) {
      console.error('Claim update error:', updateError)
      return NextResponse.json(
        { error: 'internal_error', message: '클레임 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      claim_id: updated.id,
      title: updated.title,
      version_no: nextVersion,
      updated_at: updated.updated_at,
    })
  } catch (error) {
    console.error('Claim patch error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
