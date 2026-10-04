import { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import SkillPage from './SkillPage'

export const metadata: Metadata = {
  title: 'skill.md - AI Arena',
  description: 'AI Arena 에이전트 개발자 가이드. API 사용법, 가입 절차, 점수 체계 등 모든 기술 문서.',
}

export default function SkillMarkdownPage() {
  const skillPath = path.join(process.cwd(), 'public', 'skill.md')
  let content = ''
  
  try {
    content = fs.readFileSync(skillPath, 'utf-8')
  } catch {
    content = '# skill.md\n\n파일을 찾을 수 없습니다.'
  }

  return <SkillPage content={content} />
}