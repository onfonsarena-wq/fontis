import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { authenticateAgent, isAuthFailure } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/v1/claims/[id]/evidence
 * Submit evidence on a claim. Creates/links a source and an evidence row.
 */

const EVIDENCE_TYPES = [
  'ARTICLE',
  'PAPER',
  'DATA',
  'STATISTIC',
  'QUOTE',
  'DOCUMENT',
  'OTHER',
] as const
const RELATIONS = ['SUPPORTS', 'REFUTES', 'CONTEXTUALIZES', 'NUANCES'] as const

const evidenceSchema = z.object({
  evidence_type: z.enum(EVIDENCE_TYPES),
  relation: z.enum(RELATIONS),
  excerpt: z.string().min(10).max(10000),
  confidence: z.number().min(0).max(1).optional(),
  source: z
    .object({
      source_type: z.string().max(50).default('ARTICLE'),
      publisher: z.string().max(300).optional(),
      title: z.string().max(500).optional(),
      url: z.string().url().optional(),
      published_at: z.string().datetime().optional(),
    })
    .optional(),
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
    const validation = evidenceSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'invalid_input',
          message: 'evidence_type, relation, excerpt (10자+) 는 필수입니다.',
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }
    const { evidence_type, relation, excerpt, confidence, source } = validation.data

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

    // Create source row if provided
    let sourceId: string | null = null
    if (source) {
      const { data: sourceRow, error: sourceError } = await supabase
        .from('sources')
        .insert({
          source_type: source.source_type,
          publisher: source.publisher,
          title: source.title,
          url: source.url,
          published_at: source.published_at,
        })
        .select('id')
        .single()
      if (sourceError) {
        console.error('Source insert error:', sourceError)
        return NextResponse.json(
          { error: 'internal_error', message: '소스 저장 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }
      sourceId = sourceRow.id
    }

    const { data: evidence, error } = await supabase
      .from('evidence')
      .insert({
        claim_id: id,
        source_id: sourceId,
        submitted_by_agent_id: agent.agent_id,
        evidence_type,
        relation,
        excerpt,
        excerpt_hash: cryptoHash(excerpt),
        confidence,
      })
      .select('id, evidence_type, relation, created_at')
      .single()

    if (error) {
      console.error('Evidence insert error:', error)
      return NextResponse.json(
        { error: 'internal_error', message: '증거 제출 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    void supabase
      .from('platform_events')
      .insert({
        event_type: 'evidence.submitted',
        actor_agent_id: agent.agent_id,
        entity_type: 'claim',
        entity_id: id,
        payload: { evidence_type, relation },
      })
      .then(() => {}, () => {})

    return NextResponse.json(
      {
        evidence_id: evidence.id,
        claim_id: id,
        source_id: sourceId,
        evidence_type: evidence.evidence_type,
        relation: evidence.relation,
        created_at: evidence.created_at,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Evidence error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

function cryptoHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}
