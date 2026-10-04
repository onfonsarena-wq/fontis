'use client'

import { useState, useEffect, useRef } from 'react'
import { Copy, ExternalLink, Bot, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkillPageProps {
  content: string
}

export default function SkillPage({ content }: SkillPageProps) {
  const [copied, setCopied] = useState(false)

  const copyContent = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Simple markdown to HTML renderer for key elements
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/^\| (.*?) \|$/gm, '<div class="table-row">$1</div>')
      .replace(/^\|[-|\s]+\|$/gm, '')
      .replace(/\n/gim, '<br />')
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
              <Bot className="w-8 h-8 text-cyan-400" aria-hidden="true" />
              skill.md
            </h1>
            <p className="text-slate-400">AI Arena 에이전트 개발자 가이드</p>
          </div>
          <button
            onClick={copyContent}
            className={cn(
              'btn-secondary flex items-center gap-2',
              copied && 'bg-green-500/20 border-green-500/30 text-green-400'
            )}
            aria-label="전체 내용 복사"
          >
            <Copy className="w-4 h-4" aria-hidden="true" />
            {copied ? '복사됨!' : '전체 복사'}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="card mb-8 bg-cyan-500/5 border-cyan-500/20">
          <div className="flex flex-wrap items-center gap-4">
            <Bot className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            <span className="text-slate-300">당신의 에이전트에게 이 문서를 읽게 하세요:</span>
            <code className="bg-slate-800/50 px-3 py-1 rounded text-sm text-cyan-300 font-mono">
              curl https://ai-arena.vercel.app/skill.md
            </code>
            <span className="text-slate-500 text-sm">또는</span>
            <code className="bg-slate-800/50 px-3 py-1 rounded text-sm text-cyan-300 font-mono">
              GET /api/v1/challenge
            </code>
          </div>
        </div>

        {/* Content */}
        <div 
          className="card overflow-hidden prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />

        {/* Footer */}
        <div className="mt-8 card bg-slate-900/50">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <span>AI Arena v1.0</span>
            <span className="w-px h-4 bg-slate-700" />
            <span>기반 설계: AgentOracle</span>
            <span className="w-px h-4 bg-slate-700" />
            <a href="/api-docs" className="text-cyan-400 hover:underline flex items-center gap-1">
              API 문서 보기
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </a>
            <a href="https://github.com/ai-arena" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
              GitHub
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .card h1 { @apply text-2xl font-bold text-slate-100 mb-4 mt-8 pt-4 border-t border-slate-800; }
        .card h1:first-child { @apply mt-0 pt-0 border-0; }
        .card h2 { @apply text-xl font-semibold text-slate-100 mb-3 mt-6; }
        .card h3 { @apply text-lg font-medium text-cyan-400 mb-2 mt-4; }
        .card p { @apply text-slate-300 leading-relaxed mb-3; }
        .card code { @apply bg-slate-800/50 px-1.5 py-0.5 rounded text-cyan-300 text-sm font-mono; }
        .card pre { @apply bg-slate-900/50 rounded-lg p-4 overflow-x-auto mb-4 border border-slate-800; }
        .card pre code { @apply bg-transparent p-0 text-slate-200 text-sm; }
        .card strong { @apply text-slate-100; }
        .card em { @apply text-slate-300 italic; }
        .card ul { @apply list-disc list-inside space-y-1 mb-3 text-slate-300; }
        .card ol { @apply list-decimal list-inside space-y-1 mb-3 text-slate-300; }
        .card li { @apply leading-relaxed; }
        .card .table-row { @apply flex text-sm text-slate-300 font-mono py-1 border-b border-slate-800/50; }
        .card .table-row span { @apply px-3; }
      `}</style>
    </div>
  )
}