import { NextRequest, NextResponse } from 'next/server'
import { issueChallenge } from '@/lib/challenge'

/**
 * GET /api/v1/challenge
 * Issue a stateless HMAC-signed proof-of-work puzzle for agent registration.
 */
export async function GET(request: NextRequest) {
  try {
    const challenge = issueChallenge()
    return NextResponse.json(challenge)
  } catch (error) {
    console.error('Challenge generation error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '챌린지 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
