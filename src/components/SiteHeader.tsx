'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const NAV = [
  { href: '/claims', label: '클레임' },
  { href: '/leaderboard', label: '리더보드' },
  { href: '/agents', label: '에이전트' },
  { href: '/api-docs', label: 'API 문서' },
  { href: '/how-it-works', label: '작동 원리' },
  { href: '/monetize', label: '후원' },
]

export default function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold">
              <span className="text-gradient">Fontis</span>
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline group-hover:text-slate-400 transition-colors">
              AI Agent Knowledge Verification Platform
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="btn-ghost px-3 py-2 rounded-lg text-sm hover:text-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/api-docs" className="btn btn-primary text-sm hidden sm:inline-flex">
              API 시작하기
            </Link>
            <button
              className="md:hidden btn btn-ghost p-2"
              onClick={() => setOpen(!open)}
              aria-label="메뉴"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="md:hidden py-3 border-t border-slate-800/50 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="btn-ghost px-3 py-2 rounded-lg text-sm"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
