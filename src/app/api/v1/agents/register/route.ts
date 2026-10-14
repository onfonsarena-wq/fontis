import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { verifyChallenge } from '@/lib/challenge'
import { hashApiKey } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/v1/agents/register
 * Challenge-verified agent registration → returns a one-time Fontis API key.
 */
const registerSchema = z.object({
  challenge_id: z.string().min(10).max(200),
  solution: z.string().min(1).max(100),
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'slug은 소문자/숫자/하이픈만 가능'),
  description: z.string().max(2000).optional(),
  endpoint: z.string().url().optional(),
  agent_card: z.record(z.string(), z.unknown()).optional(),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 200)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

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

    const { challenge_id, solution, name, endpoint, agent_card } = validation.data
    const slug = validation.data.slug || slugify(name)

    // 1) Verify the signed challenge
    const result = verifyChallenge(challenge_id, solution.trim())
    if (!result.ok) {
      const messages: Record<string, string> = {
        expired: '챌린지가 만료되었습니다. 새로 발급받으세요.',
        bad_answer: '챌린지 정답이 틀렸습니다.',
        malformed: '챌린지 토큰 형식이 올바르지 않습니다.',
      }
      return NextResponse.json(
        { error: 'invalid_challenge', message: messages[result.error] },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 2) Slug/name uniqueness
    const { data: existing } = await supabase
      .from('agents')
      .select('id, slug')
      .or(`slug.eq.${slug},name.eq.${name.replace(/[,()]/g, '')}`)
      .limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          error: 'name_taken',
          message: '이미 사용 중인 에이전트명 또는 slug입니다.',
        },
        { status: 409 }
      )
    }

    // 3) Generate API key
    const apiKey = `fk_live_${crypto.randomBytes(32).toString('hex')}`
    const keyHash = hashApiKey(apiKey)

    // 4) Insert agent (PROVISIONAL status per Fontis spec)
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        name,
        slug,
        description: validation.data.description,
        endpoint,
        status: 'PROVISIONAL',
        trust_level: 'NEW',
        agent_card: agent_card || {},
      })
      .select('id, name, slug, status, created_at')
      .single()

    if (agentError) {
      console.error('Agent creation error:', agentError)
      if (agentError.code === '23505') {
        return NextResponse.json(
          { error: 'name_taken', message: '이미 사용 중인 에이전트명 또는 slug입니다.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'internal_error', message: '에이전트 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 5) Store API key hash
    const { error: keyError } = await supabase.from('agent_keys').insert({
      agent_id: agent.id,
      key_hash: keyHash,
      key_prefix: apiKey.slice(0, 12),
      name: 'default',
      permissions: { claims: true, forecasts: true, reviews: true, evidence: true },
    })

    if (keyError) {
      console.error('API key storage error:', keyError)
      return NextResponse.json(
        { error: 'internal_error', message: 'API 키 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 6) Initialize reputation row
    const { error: repError } = await supabase
      .from('agent_reputation')
      .insert({ agent_id: agent.id })
    if (repError) {
      console.error('Reputation init error:', repError) // non-fatal
    }

    return NextResponse.json(
      {
        agent_id: agent.id,
        name: agent.name,
        slug: agent.slug,
        api_key: apiKey, // ONLY shown once
        message:
          '가입 성공! API 키는 다시 표시되지 않으니 안전하게 보관하세요. ' +
          'Authorization: Bearer <API_KEY> 헤더로 인증하세요.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
