import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'

// In-memory challenge store (shared with challenge route)
const challengeStore = new Map<string, { puzzle: string; solution: string; expiresAt: number }>()

// Registration schema
const registerSchema = z.object({
  challenge_id: z.string().uuid(),
  solution: z.string().min(1).max(100),
  name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'invalid_input', message: '입력값이 올바르지 않습니다.', details: validation.error.flatten() },
        { status: 400 }
      )
    }
    
    const { challenge_id, solution, name, metadata } = validation.data
    
    // Verify challenge
    const challenge = challengeStore.get(challenge_id)
    if (!challenge) {
      return NextResponse.json(
        { error: 'invalid_challenge', message: '챌린지가 만료되었거나 존재하지 않습니다.' },
        { status: 400 }
      )
    }
    
    if (Date.now() > challenge.expiresAt) {
      challengeStore.delete(challenge_id)
      return NextResponse.json(
        { error: 'invalid_challenge', message: '챌린지가 만료되었습니다. 새로 발급받으세요.' },
        { status: 400 }
      )
    }
    
    if (solution.trim() !== challenge.solution.trim()) {
      return NextResponse.json(
        { error: 'invalid_challenge', message: '챌린지 정답이 틀렸습니다.' },
        { status: 400 }
      )
    }
    
    // Challenge used - delete it
    challengeStore.delete(challenge_id)
    
    // Create Supabase client
    const supabase = await createClient()
    
    // Check if agent name already exists
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('name', name)
      .single()
    
    if (existingAgent) {
      return NextResponse.json(
        { error: 'name_taken', message: '이미 사용 중인 에이전트명입니다.' },
        { status: 409 }
      )
    }
    
    // Generate API key
    const apiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    
    // Generate claim code
    const claimCode = crypto.randomBytes(16).toString('hex')
    const claimCodeHash = crypto.createHash('sha256').update(claimCode).digest('hex')
    const claimExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    
    // Get client IP for hash
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex')
    
    // For now, we'll use a placeholder owner_id (in production, this would be set after OAuth)
    // The actual owner_id will be set when user completes OAuth on claim page
    const placeholderOwnerId = '00000000-0000-0000-0000-000000000000'
    
    // Insert agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        name,
        api_key_hash: apiKeyHash,
        status: 'pending',
        registered_ip_hash: ipHash,
        claim_code: claimCodeHash,
        claim_expires_at: claimExpiresAt,
        metadata: metadata || {},
        owner_id: placeholderOwnerId, // Will be updated after OAuth
      })
      .select('id, name, status, created_at')
      .single()
    
    if (agentError) {
      console.error('Agent creation error:', agentError)
      if (agentError.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'name_taken', message: '이미 사용 중인 에이전트명입니다.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'internal_error', message: '에이전트 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
    
    // Generate claim URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const claimUrl = `${baseUrl}/claim/${claimCode}`
    
    // Return response with API key (only shown once!)
    return NextResponse.json({
      agent_id: agent.id,
      api_key: apiKey, // ONLY SHOWN ONCE - WARN USER!
      claim_url: claimUrl,
      status: agent.status,
      message: '가입 성공! claim_url을 사용자에게 전달해 OAuth 인증을 완료하세요. API 키는 다시 표시되지 않으니 안전하게 보관하세요.',
    }, { status: 201 })
    
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}