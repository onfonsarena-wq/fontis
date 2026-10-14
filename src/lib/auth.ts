import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * API-key authentication for AI agents.
 * Key format: fk_live_<64 hex> (Fontis key)
 * Stored as SHA-256 hash in agent_keys.key_hash.
 */

export interface AuthedAgent {
  agent_id: string
  name: string
  slug: string
  status: string
  owner_id: string | null
  permissions: Record<string, unknown>
  key_id: string
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

export type AuthFailure = { error: string; message: string; status: number }

export function authError(error: string, message: string, status: number): AuthFailure {
  return { error, message, status }
}

/**
 * Extract Bearer token and resolve the agent.
 * Returns the agent on success, or an error object ready for NextResponse.json.
 */
export async function authenticateAgent(
  request: NextRequest
): Promise<AuthedAgent | AuthFailure> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return authError(
      'unauthorized',
      'Authorization 헤더가 필요합니다. 형식: Bearer YOUR_API_KEY',
      401
    )
  }

  const apiKey = authHeader.slice(7).trim()
  if (!apiKey) {
    return authError('unauthorized', 'API 키가 비어 있습니다.', 401)
  }

  const supabase = createAdminClient()
  const keyHash = hashApiKey(apiKey)

  const { data: keyRow, error: keyError } = await supabase
    .from('agent_keys')
    .select(
      `id, agent_id, permissions, expires_at, revoked_at,
       agents ( id, name, slug, status, owner_id )`
    )
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (keyError || !keyRow || !keyRow.agents) {
    return authError('agent_not_found', '유효하지 않은 API 키입니다.', 401)
  }

  if (keyRow.revoked_at) {
    return authError('key_revoked', '폐기된 API 키입니다.', 401)
  }
  if (keyRow.expires_at && new Date(keyRow.expires_at).getTime() < Date.now()) {
    return authError('key_expired', '만료된 API 키입니다.', 401)
  }

  const agent = keyRow.agents as unknown as {
    id: string
    name: string
    slug: string
    status: string
    owner_id: string | null
  }

  if (agent.status === 'SUSPENDED' || agent.status === 'BANNED') {
    return authError('agent_suspended', '이 에이전트는 정지되었습니다.', 403)
  }

  // fire-and-forget last_used_at update (best effort)
  void supabase
    .from('agent_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id)
    .then(() => {}, () => {})

  return {
    agent_id: agent.id,
    name: agent.name,
    slug: agent.slug,
    status: agent.status,
    owner_id: agent.owner_id,
    permissions: (keyRow.permissions as Record<string, unknown>) || {},
    key_id: keyRow.id,
  }
}

/** Type guard: distinguish auth failure from agent */
export function isAuthFailure(x: AuthedAgent | AuthFailure): x is AuthFailure {
  return (x as AuthFailure).error !== undefined
}
