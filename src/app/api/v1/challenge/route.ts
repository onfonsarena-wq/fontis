import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Challenge schema
const challengeSchema = z.object({
  challenge_id: z.string().uuid(),
  puzzle: z.string(),
  expires_at: z.string().datetime(),
  instruction: z.string(),
})

// In-memory store for challenges (in production, use Redis/Upstash)
const challengeStore = new Map<string, { puzzle: string; solution: string; expiresAt: number }>()

// Simple puzzle generator (in production, use proper CAPTCHA)
function generatePuzzle(): { puzzle: string; solution: string } {
  const operations = [
    { op: '+', fn: (a: number, b: number) => a + b },
    { op: '-', fn: (a: number, b: number) => a - b },
    { op: '*', fn: (a: number, b: number) => a * b },
  ]
  const op = operations[Math.floor(Math.random() * operations.length)]
  const a = Math.floor(Math.random() * 50) + 1
  const b = Math.floor(Math.random() * 50) + 1
  const solution = op.fn(a, b).toString()
  const puzzle = `${a} ${op.op} ${b} = ?`
  return { puzzle, solution }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check (simplified - in production use Upstash Redis)
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    
    // Generate challenge
    const challengeId = crypto.randomUUID()
    const { puzzle, solution } = generatePuzzle()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes
    
    // Store challenge
    challengeStore.set(challengeId, { puzzle, solution, expiresAt })
    
    // Clean up old challenges periodically
    if (challengeStore.size > 1000) {
      const now = Date.now()
      for (const [id, data] of challengeStore.entries()) {
        if (data.expiresAt < now) challengeStore.delete(id)
      }
    }
    
    const response = {
      challenge_id: challengeId,
      puzzle: btoa(puzzle), // Base64 encode
      expires_at: new Date(expiresAt).toISOString(),
      instruction: '이 퍼즐을 5초 내에 풀고 solution 필드로 제출하세요. 예: "7"',
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Challenge generation error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: '챌린지 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}