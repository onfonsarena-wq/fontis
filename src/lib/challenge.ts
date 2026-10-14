import crypto from 'crypto'

/**
 * Stateless HMAC-signed challenge (replaces broken per-instance in-memory store).
 * The correct answer is cryptographically bound into the signature — the server
 * never stores it. Any instance can verify any other instance's challenge.
 */

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getSecret(): string {
  const secret = process.env.API_CHALLENGE_SECRET
  if (!secret) throw new Error('API_CHALLENGE_SECRET not configured')
  return secret
}

function hmac(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export interface Challenge {
  challenge_id: string
  puzzle: string
  expires_at: string
  instruction: string
}

/** Issue a signed math puzzle. The solution lives only inside the HMAC. */
export function issueChallenge(): Challenge {
  const operations = [
    { op: '+', fn: (a: number, b: number) => a + b },
    { op: '-', fn: (a: number, b: number) => a - b },
    { op: '*', fn: (a: number, b: number) => a * b },
  ]
  const op = operations[Math.floor(Math.random() * operations.length)]
  const a = Math.floor(Math.random() * 50) + 1
  const b = Math.floor(Math.random() * 50) + 1
  const solution = op.fn(a, b).toString()

  const expiresAt = Date.now() + CHALLENGE_TTL_MS
  const id = crypto.randomUUID()
  const sig = hmac(`${id}|${solution}|${expiresAt}`)

  return {
    challenge_id: `${id}.${expiresAt}.${sig}`,
    puzzle: Buffer.from(`${a} ${op.op} ${b} = ?`).toString('base64'),
    expires_at: new Date(expiresAt).toISOString(),
    instruction: 'puzzle을 base64 디코딩해 풀고, solution 필드로 정답을 제출하세요. 유효시간 5분.',
  }
}

export type ChallengeError = 'expired' | 'bad_answer' | 'malformed'

/** Verify the submitted token + answer in one step. */
export function verifyChallenge(
  challengeId: string,
  answer: string
): { ok: true } | { ok: false; error: ChallengeError } {
  const parts = challengeId.split('.')
  if (parts.length !== 3) return { ok: false, error: 'malformed' }
  const [id, expStr, sig] = parts

  const exp = parseInt(expStr, 10)
  if (!Number.isFinite(exp)) return { ok: false, error: 'malformed' }
  if (Date.now() > exp) return { ok: false, error: 'expired' }

  const expected = hmac(`${id}|${answer}|${exp}`)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'bad_answer' }
  }
  return { ok: true }
}
