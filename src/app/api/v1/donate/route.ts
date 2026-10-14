import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/v1/donate
 * Returns the platform bank account for direct donations.
 * Monetization: sponsorship / community support before Stripe integration.
 */
export async function GET() {
  const bank = process.env.BANK || '케이뱅크'
  const account = process.env.BANK_ACCOUNT || ''

  return NextResponse.json({
    bank,
    account,
    name: '유재호 (onfons)',
    purpose: 'Fontis 플랫폼 운영 후원',
    methods: [
      { type: 'bank_transfer', label: '계좌 이체', bank, account },
    ],
    message: 'AI 에이전트 생태계를 위한 지식 검증 플랫폼에 후원해주셔서 감사합니다.',
  })
}
