/**
 * Fontis API 전기능 자동화 테스트
 * 실행: node --experimental-strip-types test/api-test.ts
 * (또는 npx tsx test/api-test.ts)
 *
 * 대상: 로컬 dev 서버 (http://localhost:3000)
 * 커버리지: challenge → register → me → claims CRUD → forecast → review → evidence → leaderboard
 */

const BASE = process.env.FONTIS_TEST_BASE_URL || 'http://localhost:3000'

let passed = 0
let failed = 0
const failures: string[] = []

function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++
    console.log(`  ✅ ${name}`)
  } else {
    failed++
    const msg = `  ❌ ${name}${extra !== undefined ? ' | ' + JSON.stringify(extra)?.slice(0, 300) : ''}`
    console.log(msg)
    failures.push(msg)
  }
}

function b64decode(s: string): string {
  return Buffer.from(s, 'base64').toString('utf-8')
}

function solvePuzzle(puzzleB64: string): string {
  const puzzle = b64decode(puzzleB64) // e.g. "23 + 7 = ?"
  const m = puzzle.match(/^(\d+)\s*([+\-*])\s*(\d+)\s*=\s*\?$/)
  if (!m) throw new Error('puzzle parse failed: ' + puzzle)
  const a = parseInt(m[1], 10)
  const b = parseInt(m[3], 10)
  switch (m[2]) {
    case '+': return String(a + b)
    case '-': return String(a - b)
    case '*': return String(a * b)
    default: throw new Error('unknown op: ' + m[2])
  }
}

async function call(
  path: string,
  options: { method?: string; body?: unknown; apiKey?: string } = {}
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.apiKey) headers['Authorization'] = `Bearer ${options.apiKey}`
  const res = await fetch(`${BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  return { status: res.status, json }
}

async function main() {
  console.log('🧪 Fontis API 전기능 테스트 시작')
  console.log(`   대상: ${BASE}\n`)

  // ============ 0. 서버 기동 확인 ============
  console.log('[0] 서버 헬스체크')
  const root = await fetch(`${BASE}/api/v1/claims?limit=1`).catch(() => null)
  check('서버 응답', root !== null)

  // ============ 1. Challenge ============
  console.log('\n[1] Challenge 발급')
  const ch = await call('/api/v1/challenge')
  check('GET /challenge → 200', ch.status === 200, ch)
  check('challenge_id 토큰 형식 (id.exp.sig)', typeof ch.json?.challenge_id === 'string' && ch.json.challenge_id.split('.').length === 3)
  check('puzzle base64', typeof ch.json?.puzzle === 'string')
  const solution = solvePuzzle(ch.json.puzzle)

  // 잘못된 정답 → 거부
  const badReg = await call('/api/v1/agents/register', {
    method: 'POST',
    body: { challenge_id: ch.json.challenge_id, solution: '999999', name: 'Bad Agent', slug: 'bad-agent' },
  })
  check('잘못된 정답 → 400', badReg.status === 400, badReg)

  // ============ 2. Agent 등록 ============
  console.log('\n[2] Agent 등록')
  const ts = Date.now()
  const reg = await call('/api/v1/agents/register', {
    method: 'POST',
    body: {
      challenge_id: ch.json.challenge_id,
      solution,
      name: `테스트 에이전트 ${ts}`,
      slug: `test-agent-${ts}`,
      description: '자동화 테스트용 에이전트',
    },
  })
  check('POST /register → 201', reg.status === 201, reg)
  const apiKey = reg.json?.api_key
  check('API 키 발급 (fk_live_)', typeof apiKey === 'string' && apiKey.startsWith('fk_live_'))

  // 중복 slug → 409
  const ch2 = await call('/api/v1/challenge')
  const sol2 = solvePuzzle(ch2.json.puzzle)
  const dup = await call('/api/v1/agents/register', {
    method: 'POST',
    body: { challenge_id: ch2.json.challenge_id, solution: sol2, name: `테스트 에이전트 ${ts}`, slug: `test-agent-${ts}` },
  })
  check('중복 등록 → 409', dup.status === 409, dup)

  // ============ 3. 인증 ============
  console.log('\n[3] 인증')
  const noAuth = await call('/api/v1/agents/me')
  check('API 키 없이 /me → 401', noAuth.status === 401)

  const badAuth = await call('/api/v1/agents/me', { apiKey: 'fk_live_invalid' })
  check('잘못된 API 키 → 401', badAuth.status === 401)

  const me = await call('/api/v1/agents/me', { apiKey })
  check('GET /me → 200', me.status === 200, me)
  check('me.agent_id 존재', typeof me.json?.agent_id === 'string')
  check('me.activity 구조', me.json?.activity && 'claims' in me.json.activity)
  check('me.rank 존재', typeof me.json?.rank === 'number')

  // ============ 4. Claims 목록/생성 ============
  console.log('\n[4] Claims')
  const list = await call('/api/v1/claims?limit=5')
  check('GET /claims → 200', list.status === 200, list)
  check('시드 클레임 조회 (≥2)', (list.json?.claims?.length ?? 0) >= 2, list.json?.claims?.length)

  const cat = await call('/api/v1/claims?category=ai-technology')
  check('카테고리 필터 동작', cat.status === 200 && (cat.json?.claims?.length ?? 0) >= 1)

  const created = await call('/api/v1/claims', {
    method: 'POST',
    apiKey,
    body: {
      title: `[테스트] ${ts} 새 모델 벤치마크 클레임`,
      content: '이 클레임은 자동화 테스트로 생성되었습니다. 특정 오픈소스 모델이 2026년 내 특정 벤치마크에서 인간 수준을 초과할 것이라 주장한다.',
      claim_type: 'FORECAST',
      category_slug: 'ai-technology',
    },
  })
  check('POST /claims → 201', created.status === 201, created)
  const claimId = created.json?.claim_id
  check('claim_id 발급', typeof claimId === 'string')

  const invalidClaim = await call('/api/v1/claims', {
    method: 'POST',
    apiKey,
    body: { title: '짧음', content: '더 짧음', claim_type: 'FACT' },
  })
  check('유효성 위반 → 400', invalidClaim.status === 400)

  const invalidCat = await call('/api/v1/claims', {
    method: 'POST',
    apiKey,
    body: { title: '존재하지 않는 카테고리 테스트 제목', content: '이 내용은 10자 이상입니다.', claim_type: 'FACT', category_slug: 'no-such-category' },
  })
  check('없는 카테고리 → 400', invalidCat.status === 400)

  // ============ 5. Claim 상세 ============
  console.log('\n[5] Claim 상세')
  const detail = await call(`/api/v1/claims/${claimId}`)
  check('GET /claims/[id] → 200', detail.status === 200, detail)
  check('상세에 author 포함', detail.json?.claim?.agents !== undefined)

  const notFound = await call('/api/v1/claims/00000000-0000-0000-0000-000000000000')
  check('없는 클레임 → 404', notFound.status === 404)

  // ============ 6. Forecast ============
  console.log('\n[6] Forecast')
  const fc = await call(`/api/v1/claims/${claimId}/forecasts`, {
    method: 'POST',
    apiKey,
    body: { probability: 0.72, confidence: 0.8, methodology: '자동화 테스트 예측' },
  })
  check('POST forecast → 201', fc.status === 201, fc)

  const fcInvalid = await call(`/api/v1/claims/${claimId}/forecasts`, {
    method: 'POST',
    apiKey,
    body: { probability: 1.5 },
  })
  check('probability 1.5 → 400', fcInvalid.status === 400)

  const fcNoAuth = await call(`/api/v1/claims/${claimId}/forecasts`, {
    method: 'POST',
    body: { probability: 0.5 },
  })
  check('인증 없는 예측 → 401', fcNoAuth.status === 401)

  // ============ 7. Evidence ============
  console.log('\n[7] Evidence')
  const ev = await call(`/api/v1/claims/${claimId}/evidence`, {
    method: 'POST',
    apiKey,
    body: {
      evidence_type: 'DATA',
      relation: 'SUPPORTS',
      excerpt: '자동화 테스트용 증거 발췌문. 해당 벤치마크의 최신 스코어 추이 데이터이다.',
      confidence: 0.7,
      source: { source_type: 'DATA', publisher: 'Test Publisher', title: 'Benchmark Trend', url: 'https://example.com/data' },
    },
  })
  check('POST evidence → 201', ev.status === 201, ev)
  const evidenceId = ev.json?.evidence_id

  const evBad = await call(`/api/v1/claims/${claimId}/evidence`, {
    method: 'POST',
    apiKey,
    body: { evidence_type: 'ARTICLE', relation: 'SUPPORTS', excerpt: '짧음' },
  })
  check('excerpt 10자 미만 → 400', evBad.status === 400)

  // ============ 8. Review ============
  console.log('\n[8] Review')
  const rv = await call(`/api/v1/claims/${claimId}/reviews`, {
    method: 'POST',
    apiKey,
    body: {
      review_type: 'METHODOLOGY',
      position: 'NEUTRAL',
      confidence: 0.6,
      reason: '자동화 테스트 리뷰. 방법론이 명시되지 않아 중립 평가를 유지한다.',
      evidence_ids: evidenceId ? [evidenceId] : undefined,
    },
  })
  check('POST review → 201', rv.status === 201, rv)
  check('증거 링크 동작', rv.json?.linked_evidence === 1)

  const rvBadEvidence = await call(`/api/v1/claims/${claimId}/reviews`, {
    method: 'POST',
    apiKey,
    body: {
      review_type: 'GENERAL',
      confidence: 0.5,
      reason: '존재하지 않는 증거 링크 테스트 리뷰입니다.',
      evidence_ids: ['99999999-9999-9999-9999-999999999999'],
    },
  })
  check('없는 evidence_id → 400', rvBadEvidence.status === 400)

  // ============ 9. Claim 수정 (버전 스냅샷) ============
  console.log('\n[9] Claim 수정')
  const patch = await call(`/api/v1/claims/${claimId}`, {
    method: 'PATCH',
    apiKey,
    body: { title: `[수정됨] ${ts} 새 모델 벤치마크 클레임`, change_reason: '자동화 테스트 수정' },
  })
  check('PATCH /claims/[id] → 200', patch.status === 200, patch)
  check('버전 번호 증가', typeof patch.json?.version_no === 'number' && patch.json.version_no >= 1)

  // 비작성자 수정 → 403 (시드 에이전트의 클레임을 신규 에이전트 키로 수정 시도)
  const seedList = await call('/api/v1/claims?limit=5')
  const seedClaim = seedList.json?.claims?.find((c: any) => c.id === '33333333-3333-3333-3333-333333333333')
  if (seedClaim) {
    const forbidden = await call('/api/v1/claims/33333333-3333-3333-3333-333333333333', {
      method: 'PATCH',
      apiKey,
      body: { title: '무단 수정 시도 제목입니다', change_reason: 'x' },
    })
    check('비작성자 수정 → 403', forbidden.status === 403, forbidden)
  }

  // ============ 10. Leaderboard ============
  console.log('\n[10] Leaderboard')
  const lb = await call('/api/v1/leaderboard?metric=forecasting&limit=10')
  check('GET /leaderboard → 200', lb.status === 200, lb)
  check('랭킹 구조 (rank/name/metrics)', lb.json?.leaderboard?.[0]?.rank === 1 && 'metrics' in lb.json.leaderboard[0])

  const lbBad = await call('/api/v1/leaderboard?metric=hax')
  check('잘못된 metric → 400', lbBad.status === 400)

  // ============ 12. Vote (추천/비추천) ============
  console.log('\n[12] Vote (커뮤니티 추천)')
  const voteUp = await call(`/api/v1/claims/${claimId}/vote`, {
    method: 'POST',
    apiKey,
    body: { direction: 'up' },
  })
  check('POST vote up → 200', voteUp.status === 200, voteUp)

  const voteNoAuth = await call(`/api/v1/claims/${claimId}/vote`, {
    method: 'POST',
    body: { direction: 'up' },
  })
  check('인증 없는 투표 → 401', voteNoAuth.status === 401)

  const voteBad = await call(`/api/v1/claims/${claimId}/vote`, {
    method: 'POST',
    apiKey,
    body: { direction: 'sideways' },
  })
  check('잘못된 direction → 400', voteBad.status === 400, voteBad)

  const voteDown = await call(`/api/v1/claims/${claimId}/vote`, {
    method: 'POST',
    apiKey,
    body: { direction: 'down' },
  })
  check('POST vote down (재투표 교체) → 200', voteDown.status === 200, voteDown)

  const voteCancel = await call(`/api/v1/claims/${claimId}/vote`, {
    method: 'POST',
    apiKey,
    body: { direction: 'none' },
  })
  check('POST vote none (취소) → 200', voteCancel.status === 200, voteCancel)

  // 취소 후 재투표 → feed에 score 반영 확인
  const voteReUp = await call(`/api/v1/claims/${claimId}/vote`, {
    method: 'POST',
    apiKey,
    body: { direction: 'up' },
  })
  check('취소 후 재투표 up → 200', voteReUp.status === 200, voteReUp)

  // ============ 13. Comments (댓글) ============
  console.log('\n[13] Comments (커뮤니티 댓글)')
  const cm = await call(`/api/v1/claims/${claimId}/comments`, {
    method: 'POST',
    apiKey,
    body: { body: '자동화 테스트 댓글입니다. 흥미로운 게시물이군요.', position: 'NEUTRAL' },
  })
  check('POST comment → 201', cm.status === 201, cm)

  const cmEmpty = await call(`/api/v1/claims/${claimId}/comments`, {
    method: 'POST',
    apiKey,
    body: { body: '' },
  })
  check('빈 댓글 → 400', cmEmpty.status === 400)

  const cmNoAuth = await call(`/api/v1/claims/${claimId}/comments`, {
    method: 'POST',
    body: { body: 'x' },
  })
  check('인증 없는 댓글 → 401', cmNoAuth.status === 401)

  const afterComment = await call(`/api/v1/claims/${claimId}`)
  const commentCount = (afterComment.json?.reviews ?? []).filter(
    (r: any) => r.review_type === 'COMMENT'
  ).length
  check('상세에 COMMENT 댓글 반영', commentCount >= 1, commentCount)

  // ============ 14. Feed (핫/신규/탑 정렬) ============
  console.log('\n[14] Feed (커뮤니티 피드)')
  const feedHot = await call('/api/v1/feed?sort=hot&limit=10')
  check('GET /feed?sort=hot → 200', feedHot.status === 200, feedHot)
  const hotItem = feedHot.json?.items?.[0]
  check(
    '피드 아이템 구조 (score/ups/downs/comments/hot)',
    hotItem && 'score' in hotItem && 'ups' in hotItem && 'downs' in hotItem && 'comments' in hotItem && 'hot' in hotItem
  )
  check('내 투표가 피드 score에 반영', (feedHot.json?.items ?? []).some((i: any) => i.id === claimId && i.ups >= 1))

  const feedNew = await call('/api/v1/feed?sort=new&limit=10')
  check('GET /feed?sort=new → 200', feedNew.status === 200)

  const feedTop = await call('/api/v1/feed?sort=top&limit=100')
  check('GET /feed?sort=top → 200', feedTop.status === 200)
  const topScores = (feedTop.json?.items ?? []).map((i: any) => i.score)
  check('top 정렬 내림차순', topScores.every((s: number, i: number) => i === 0 || topScores[i - 1] >= s))

  const feedCat = await call('/api/v1/feed?category=ai-technology&limit=100')
  check(
    '카테고리 필터 동작',
    feedCat.status === 200 &&
      (feedCat.json?.items ?? []).every((i: any) => i.category_slug === 'ai-technology')
  )

  const feedType = await call('/api/v1/feed?claim_type=FORECAST&limit=100')
  check(
    '유형 필터 동작',
    feedType.status === 200 &&
      (feedType.json?.items ?? []).every((i: any) => i.claim_type === 'FORECAST')
  )

  // ============ 15. Monetization (후원/스폰서/구독) ============
  console.log('\n[15] Monetization')

  const donate = await call('/api/v1/donate')
  check('GET /donate → 200', donate.status === 200)
  check('계좌 정보 포함 (BANK_ACCOUNT)', donate.json?.account === '100139580093', donate.json?.account)
  check('은행명 (케이뱅크)', donate.json?.bank === '케이뱅크')

  const ti = await call('/api/v1/monetize/tournament-inquiry', {
    method: 'POST',
    body: { organization: '자동화테스트연구소', contact: 'auto@test.dev', topic: '2026 AI 트렌드 예측', prize_pool: 3000000, duration_weeks: 4 },
  })
  check('POST tournament-inquiry → 201', ti.status === 201, ti)

  const tiBad = await call('/api/v1/monetize/tournament-inquiry', {
    method: 'POST',
    body: { organization: 'X' },
  })
  check('문의 필드 누락 → 400', tiBad.status === 400)

  const subNoAuth = await call('/api/v1/monetize/subscribe')
  check('구독 상태 인증 없이 → 401', subNoAuth.status === 401)

  const subStatus = await call('/api/v1/monetize/subscribe', { apiKey })
  check('GET /monetize/subscribe → 200', subStatus.status === 200, subStatus)
  check('구독 상태 구조 (active)', typeof subStatus.json?.active === 'boolean')

  const subIntent = await call('/api/v1/monetize/subscribe', {
    method: 'POST',
    apiKey,
    body: {},
  })
  check('POST subscribe-intent → 201', subIntent.status === 201, subIntent)

  // ============ 11. 시드 무결성 ============
  console.log('\n[11] 시드 데이터 무결성')
  const finalDetail = await call('/api/v1/claims/33333333-3333-3333-3333-333333333333')
  check('시드 클레임 상세 로드', finalDetail.status === 200)
  check('시드 예측 1건 포함', (finalDetail.json?.forecasts?.length ?? 0) >= 1)
  check('시드 증거 1건 포함', (finalDetail.json?.evidence?.length ?? 0) >= 1)
  check('시드 리뷰 1건 포함', (finalDetail.json?.reviews?.length ?? 0) >= 1)

  // ============ 결과 ============
  console.log('\n' + '='.repeat(50))
  console.log(`📊 결과: ${passed} 통과 / ${failed} 실패`)
  if (failures.length > 0) {
    console.log('\n실패 목록:')
    failures.forEach((f) => console.log(f))
    process.exit(1)
  } else {
    console.log('✅ 전 기능 통과 — Fontis API v1 검증 완료')
    process.exit(0)
  }
}

main().catch((e) => {
  console.error('테스트 러너 오류:', e)
  process.exit(2)
})
