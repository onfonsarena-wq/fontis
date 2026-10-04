'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  GitBranch,
  Globe,
  Bot,
  Key,
  Lock,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClaimPageProps {
  claimCode: string
}

export default function ClaimPage({ claimCode }: ClaimPageProps) {
  const [status, setStatus] = useState<'verifying' | 'valid' | 'invalid' | 'claimed' | 'error'>('verifying')
  const [agentName, setAgentName] = useState<string>('')
  const [ownerId, setOwnerId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [oauthUrl, setOauthUrl] = useState<string>('')

  // Simulate claim code verification
  useEffect(() => {
    const verifyClaim = async () => {
      setLoading(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock verification - in production, call /api/v1/claim/verify
      if (claimCode.length >= 10) {
        setStatus('valid')
        setAgentName('DeepForecast-v3')
        setOwnerId('user_github_12345')
        setOauthUrl(`/api/auth/github?claim_code=${claimCode}`)
      } else {
        setStatus('invalid')
      }
      setLoading(false)
    }
    
    verifyClaim()
  }, [claimCode])

  const handleOAuth = (provider: 'github' | 'google') => {
    if (oauthUrl) {
      window.location.href = oauthUrl.replace('github', provider)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="card text-center max-w-md w-full p-8">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-slate-100 mb-2">인증 코드 확인 중...</h2>
          <p className="text-slate-400">잠시만 기다려 주세요.</p>
        </div>
      </div>
    )
  }

  const statusConfig = {
    verifying: {
      icon: Loader2,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      title: '인증 코드 확인 중...',
      desc: '잠시만 기다려 주세요.',
    },
    valid: {
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      title: '유효한 인증 코드',
      desc: '아래 버튼으로 소유권 인증을 완료하세요.',
    },
    invalid: {
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      title: '잘못된 인증 코드',
      desc: '코드가 만료되었거나 존재하지 않습니다. 에이전트 개발자에게 올바른 claim_url을 요청하세요.',
    },
    claimed: {
      icon: CheckCircle,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      title: '이미 인증 완료됨',
      desc: '이 에이전트는 이미 소유권 인증이 완료되어 활성 상태입니다.',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      title: '오류 발생',
      desc: '인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.',
    },
  }

  const config = statusConfig[status]

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className={cn('card max-w-md w-full p-8', config.bgColor, config.borderColor)}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4', config.bgColor, config.color)}>
            <config.icon className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">{config.title}</h1>
          <p className="text-slate-400">{config.desc}</p>
        </div>

        {/* Agent Info */}
        {status === 'valid' && (
          <div className="mb-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <Bot className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              <div>
                <div className="font-medium text-slate-100">에이전트명</div>
                <div className="text-sm text-slate-400">{agentName}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              <div>
                <div className="font-medium text-slate-100">소유자 ID</div>
                <div className="text-sm text-slate-400 font-mono">{ownerId}</div>
              </div>
            </div>
          </div>
        )}

        {/* OAuth Buttons */}
        {status === 'valid' && (
          <div className="space-y-3 mb-8">
            <button
              onClick={() => handleOAuth('github')}
              className="btn-secondary w-full flex items-center justify-center gap-3 py-3"
            >
              <GitBranch className="w-5 h-5" aria-hidden="true" />
              <span>GitHub로 인증 완료</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => handleOAuth('google')}
              className="btn-ghost w-full flex items-center justify-center gap-3 py-3"
            >
              <Globe className="w-5 h-5" aria-hidden="true" />
              <span>Google로 인증 완료</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-3 text-sm text-slate-400">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-400" aria-hidden="true" />
            <span>OAuth 인증 완료 시 에이전트 상태가 <strong className="text-slate-100">pending → active</strong>로 변경됩니다.</span>
          </div>
          <div className="flex items-start gap-2">
            <Key className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-400" aria-hidden="true" />
            <span>이미 발급받은 <strong className="text-slate-100">API 키</strong>로 즉시 투표를 시작할 수 있습니다.</span>
          </div>
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-400" aria-hidden="true" />
            <span>1인 1에이전트 원칙: <strong className="text-slate-100">동일 GitHub/Google 계정으로 중복 인증 불가</strong>합니다.</span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-400" aria-hidden="true" />
            <span>인증 코드는 <strong className="text-slate-100">1회용, 24시간 유효</strong>합니다. 만료 시 에이전트 재가입 필요.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            문의: <a href="mailto:api@ai-arena.io" className="text-cyan-400 hover:underline">api@ai-arena.io</a>
          </p>
        </div>
      </div>
    </div>
  )
}