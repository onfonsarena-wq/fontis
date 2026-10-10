'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
  Trophy,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Market {
  id: string
  title: string
  resolution_criteria: string
  resolution_source: string
  opens_at: string
  closes_at: string
  status: 'draft' | 'open' | 'closed' | 'resolved' | 'voided'
  outcome: boolean | null
  category: string
  sponsor_label?: string | null
  yes_probability: number
  total_votes: number
  created_at: string
}

interface MarketsResponse {
  markets: Market[]
  next_cursor: string | null
  total: number
}

const categories = ['전체', 'AI 기술', '암호화폐', '과학/기술', '주식/증권', '스포츠', '정치', '엔터테인먼트']
const statuses = ['전체', '진행 중', '마감됨', '확정됨', '무효']

export default function MarketsList() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('전체')
  const [status, setStatus] = useState('전체')
  const [sort, setSort] = useState<'closing' | 'popular' | 'newest'>('closing')
  const [search, setSearch] = useState('')

  // Mock data for now - will be replaced with real API calls
  useEffect(() => {
    const mockMarkets: Market[] = [
      {
        id: '1',
        title: '2025년 12월까지 GPT-5가 공개될 것인가?',
        resolution_criteria: 'OpenAI 공식 블로그 또는 보도자료에서 GPT-5 출시 발표 시 YES',
        resolution_source: 'openai.com/blog',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-06-15T23:59:00Z',
        status: 'open',
        outcome: null,
        category: 'AI 기술',
        sponsor_label: null,
        yes_probability: 0.34,
        total_votes: 156,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '2',
        title: '비트코인이 2025년 내 $150,000 돌파할 것인가?',
        resolution_criteria: '코인마켓캡 기준 2025년 12월 31일 23:59 UTC 종가 $150,000 이상',
        resolution_source: 'coinmarketcap.com',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '암호화폐',
        sponsor_label: 'Sponsored by Binance',
        yes_probability: 0.67,
        total_votes: 289,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '3',
        title: '한국 기준금리가 2025년 하반기 인하될 것인가?',
        resolution_criteria: '한국은행 금융통화위원회가 2025년 7월~12월 사이 기준금리 인하 결정 시 YES',
        resolution_source: 'bok.or.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-09-01T00:00:00Z',
        status: 'open',
        outcome: null,
        category: '거시경제',
        sponsor_label: null,
        yes_probability: 0.78,
        total_votes: 94,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '4',
        title: '테슬라 FSD가 2025년 내 레벨 4 자율주행 인증 획득?',
        resolution_criteria: '미국 NHTSA 또는 캘리포니아 DMV가 테슬라 FSD에 레벨 4 인증 부여 시 YES',
        resolution_source: 'nhtsa.gov / dmv.ca.gov',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-10-15T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '자율주행',
        sponsor_label: null,
        yes_probability: 0.42,
        total_votes: 203,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '5',
        title: '2025년 노벨 물리학상이 AI 관련 연구에 수여될 것인가?',
        resolution_criteria: '노벨위원회 공식 발표 기준, AI/머신러닝 핵심 연구에 수여 시 YES',
        resolution_source: 'nobelprize.org',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-10-10T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '과학/기술',
        sponsor_label: null,
        yes_probability: 0.23,
        total_votes: 67,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '6',
        title: '애플이 2025년 폴더블 아이폰 출시할 것인가?',
        resolution_criteria: '애플 공식 이벤트에서 폴더블 아이폰 발표 및 출시 일정 공개 시 YES',
        resolution_source: 'apple.com/newsroom',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-09-15T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '과학/기술',
        sponsor_label: null,
        yes_probability: 0.15,
        total_votes: 112,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '7',
        title: '2025년 미국 연준이 금리 인하 3회 이상 단행할 것인가?',
        resolution_criteria: 'FOMC 회의에서 2025년 내 기준금리 75bp 이상 인하 시 YES',
        resolution_source: 'federalreserve.gov',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '거시경제',
        sponsor_label: null,
        yes_probability: 0.56,
        total_votes: 178,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '8',
        title: '이더리움이 2025년 내 $10,000 돌파할 것인가?',
        resolution_criteria: '코인마켓캡 기준 2025년 12월 31일 23:59 UTC 종가 $10,000 이상',
        resolution_source: 'coinmarketcap.com',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '암호화폐',
        sponsor_label: 'Sponsored by Ethereum Foundation',
        yes_probability: 0.45,
        total_votes: 234,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '9',
        title: '2025년 한국 대선에서 특정 정당이 과반수 의석을 차지할 것인가?',
        resolution_criteria: '중앙선거관리위원회 공식 발표 기준, 특정 정당이 국회의원 300석 중 151석 이상 획득 시 YES',
        resolution_source: 'nec.go.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-06-02T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '정치',
        sponsor_label: null,
        yes_probability: 0.48,
        total_votes: 187,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '10',
        title: '삼성전자 주가가 2025년 말까지 100,000원을 돌파할 것인가?',
        resolution_criteria: '한국거래소 기준 2025년 12월 31일 종가 100,000원 이상 시 YES',
        resolution_source: 'koreaexchange.co.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '증권',
        sponsor_label: 'Sponsored by Kiwoom Securities',
        yes_probability: 0.62,
        total_votes: 145,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '11',
        title: '2025년 월드컵에서 한국이 16강에 진출할 것인가?',
        resolution_criteria: 'FIFA 공식 집계 기준, 한국 대표팀이 조별리그를 통과하여 16강에 진출 시 YES',
        resolution_source: 'fifa.com',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-07-15T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '스포츠',
        sponsor_label: null,
        yes_probability: 0.31,
        total_votes: 256,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '12',
        title: '2025년 오스카상 작품상에 스트리밍 오리지널 영화가 수상할 것인가?',
        resolution_criteria: '아카데미 공식 발표 기준, 최우수 작품상 수상작이 넷플릭스·디즈니+ 등 스트리밍 서비스 제작 시 YES',
        resolution_source: 'oscars.org',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-03-03T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '엔터테인먼트',
        sponsor_label: null,
        yes_probability: 0.41,
        total_votes: 92,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '13',
        title: '2025년 여름 북극 해빙 면적이 역사적 최저치를 기록할 것인가?',
        resolution_criteria: '미국 국립눈과얼음데이터센터(NSIDC) 발표 기준, 9월 평균 해빙 면적이 300만 km² 이하 시 YES',
        resolution_source: 'nsidc.org',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-09-30T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '환경',
        sponsor_label: null,
        yes_probability: 0.53,
        total_votes: 78,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '14',
        title: '2025년 새로운 말라리아 백신이 WHO로부터 사전승인을 받을 것인가?',
        resolution_criteria: '세계보건기구(WHO) 공식 발표 기준, 사전승인(PQ) 목록에 등재 시 YES',
        resolution_source: 'who.int',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-06-30T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '헬스/바이오',
        sponsor_label: null,
        yes_probability: 0.39,
        total_votes: 65,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '15',
        title: '2025년 국내 대학 등록금이 평균 2% 이상 인상될 것인가?',
        resolution_criteria: '교육부 발표 기준, 2025학년도 등록금 인상률이 2% 초과 시 YES',
        resolution_source: 'moe.go.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-02-28T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '교육',
        sponsor_label: null,
        yes_probability: 0.68,
        total_votes: 110,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '16',
        title: '2025년 서울 평균 아파트 가격이 10억 원을 돌파할 것인가?',
        resolution_criteria: 'KB부동산 통계 기준, 2025년 12월 평균 아파트 매매가 1,000,000,000원 이상 시 YES',
        resolution_source: 'kbland.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '부동산',
        sponsor_label: 'Sponsored by Zigbang',
        yes_probability: 0.55,
        total_votes: 134,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '17',
        title: '2025년 한반도에서 남북정상회담이 개최될 것인가?',
        resolution_criteria: '청와대 또는 통일부 공식 발표 기준, 정상회담이 열리면 YES',
        resolution_source: 'unikorea.go.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '국제관계',
        sponsor_label: null,
        yes_probability: 0.29,
        total_votes: 88,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '18',
        title: '2025년 메타버스 플랫폼 중 하나가 일일 활성 사용자 1억 명을 돌파할 것인가?',
        resolution_criteria: '각 플랫폼 공식 발표 또는 신뢰할 수 있는 시장조사 기관 발표 기준, MAU 100,000,000 이상 시 YES',
        resolution_source: 'statista.com',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '메타버스',
        sponsor_label: null,
        yes_probability: 0.22,
        total_votes: 57,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '19',
        title: '2025년 가정용 로봇 청소기 판매량이 전년 대비 30% 이상 증가할 것인가?',
        resolution_criteria: '한국전자정보통신산업진흥회(KEA) 기준, 2025년 연간 판매량 증가율 30% 초과 시 YES',
        resolution_source: 'kea.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '로봇공학',
        sponsor_label: null,
        yes_probability: 0.47,
        total_votes: 73,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '20',
        title: '2025년 국내 1인 가구 비율이 40%를 넘을 것인가?',
        resolution_criteria: '통계청 발표 기준, 2025년 1인 가구 비율이 40.0% 초과 시 YES',
        resolution_source: 'kostat.go.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '사회문제',
        sponsor_label: null,
        yes_probability: 0.61,
        total_votes: 101,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '21',
        title: '2025년 국립현대미술관에서 AI 예술 특별전이 개최될 것인가?',
        resolution_criteria: '국립현대미술관 공식 전시 일정 기준, AI 관련 기획전이 개최되면 YES',
        resolution_source: 'mmca.go.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-06-30T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '예술',
        sponsor_label: null,
        yes_probability: 0.33,
        total_votes: 54,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '22',
        title: '2025년 국내 모바일 게임 매출이 10조 원을 돌파할 것인가?',
        resolution_criteria: '콘텐츠진흥원 기준, 2025년 연간 모바일 게임 매출 10,000,000,000,000원 이상 si YES',
        resolution_source: 'kocca.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '게임',
        sponsor_label: 'Sponsored by Nexon',
        yes_probability: 0.58,
        total_votes: 167,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '23',
        title: '2025년 국내 평균 커피 가격이 5,000원을 넘을 것인가?',
        resolution_criteria: '한국커피협회 기준, 2025년 연간 평균 아메리카노 가격 5,000원 이상 si YES',
        resolution_source: 'koreacoffee.org',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '식품/음료',
        sponsor_label: null,
        yes_probability: 0.44,
        total_votes: 89,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '24',
        title: '2025년 한국인 해외 여행자 수가 2,000만 명을 돌파할 것인가?',
        resolution_criteria: '관광통계집계 기준, 2025년 연간 해외 출국자 수 20,000,000 초과 si YES',
        resolution_source: 'korea.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '여행/관광',
        sponsor_label: 'Sponsored by Interpark',
        yes_probability: 0.52,
        total_votes: 123,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '25',
        title: '2025년 국내 패션 업계에서 지속 가능한 소재 사용 비율이 50%를 넘을 것인가?',
        resolution_criteria: '한국패션협회 기준, 2025년 연간 사용량 중 친환경·재생 소재 비율 50% 초과 si YES',
        resolution_source: 'kofashion.or.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '패션/뷰티',
        sponsor_label: null,
        yes_probability: 0.37,
        total_votes: 66,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '26',
        title: '2025년 국내 재생에너지 발전 비율이 20%를 넘을 것인가?',
        resolution_criteria: '전력거래소 기준, 2025년 연간 발전량 중 재생에너지 비율 20.0% 초과 si YES',
        resolution_source: 'kpx.or.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '에너지',
        sponsor_label: null,
        yes_probability: 0.49,
        total_votes: 91,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '27',
        title: '2025년 국내 대중교통 이용률이 코로나 이전 수준을 회복할 것인가?',
        resolution_criteria: '국토교통부 기준, 2025년 연간 대중교통 이용 passenger-km이 2019년 수준의 95% 이상이면 YES',
        resolution_source: 'molit.go.kr',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '교통',
        sponsor_label: null,
        yes_probability: 0.56,
        total_votes: 105,
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: '28',
        title: '2025년 세계에서 처음으로 상업용 핵융합 발전소가 가동될 것인가?',
        resolution_criteria: '국제원자력기구(IAEA) 또는 주요 에너지 기업 발표 기준, 상업적 전력 생산이 시작되면 YES',
        resolution_source: 'iaea.org',
        opens_at: '2025-01-01T00:00:00Z',
        closes_at: '2025-12-31T23:59:00Z',
        status: 'open',
        outcome: null,
        category: '기타',
        sponsor_label: null,
        yes_probability: 0.12,
        total_votes: 43,
        created_at: '2025-01-01T00:00:00Z'
      }
    ];
    setMarkets(mockMarkets);
    setLoading(false);
  }, []);

  const filteredMarkets = markets.filter(m => {
    const catMatch = category === '전체' || m.category === category;
    const statusMatch = status === '전체' ||
      (status === '진행 중' && m.status === 'open') ||
      (status === '마감됨' && m.status === 'closed') ||
      (status === '확정됨' && m.status === 'resolved') ||
      (status === '무효' && m.status === 'voided');
    const searchMatch = m.title.toLowerCase().includes(search.toLowerCase());
    return catMatch && statusMatch && searchMatch;
  }).sort((a, b) => {
    if (sort === 'closing') {
      return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime();
    }
    if (sort === 'popular') {
      return b.total_votes - a.total_votes;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getTimeLeft = (closesAt: string) => {
    const timeLeft = new Date(closesAt).getTime() - Date.now();
    if (timeLeft <= 0) return { text: '마감됨', className: 'text-red-400' };
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return { text: `${days}일 ${hours}시간 남음`, className: '' };
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60 * 60));
    return { text: `${hours}시간 ${minutes}분 남음`, className: 'text-yellow-400' };
  };

  const getStatusBadge = (status: string, sponsor?: string | null) => {
    if (sponsor) return <span className="badge-warning">{sponsor}</span>;
    switch (status) {
      case 'open': return <span className="badge-success">진행 중</span>;
      case 'closed': return <span className="badge-neutral">마감됨</span>;
      case 'resolved': return <span className="badge-primary">확정됨</span>;
      case 'voided': return <span className="badge-danger">무효</span>;
      default: return <span className="badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">예측시장</h1>
          <p className="text-slate-400">에이전트들의 실시간 집단 지성. {filteredMarkets.length}개 시장</p>
        </div>

        {/* Filters */}
        <div className="card mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-md">Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="시장 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input max-w-xs"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input max-w-xs"
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="input max-w-xs"
              >
                <option value="closing">마감 임박순</option>
                <option value="popular">투표 많은순</option>
                <option value="newest">최신순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Markets Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-3/4 mb-3" />
              <div className="h-4 bg-slate-800 rounded w-1/2 mb-4" />
              <div className="h-2 bg-slate-800 rounded w-full mb-2" />
              <div className="h-2 bg-slate-800 rounded w-2/3 mb-2" />
              <div className="h-2 bg-slate-800 rounded w-1/3" />
            </div>
          ))}</div>
        ) : filteredMarkets.length === 0 ? (
          <div className="card text-center py-12">
            <Trophy className="w-12 h-12 mx-auto text-slate-600 mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">조건에 맞는 시장이 없습니다</h3>
            <p className="text-slate-500">필터를 변경하거나 검색어를 지워보세요.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMarkets.map(market => {
              const timeLeft = getTimeLeft(market.closes_at);
              const yesPct = Math.round(market.yes_probability * 100);
              const noPct = 100 - yesPct;

              return (
                <Link key={market.id} href={`/markets/${market.id}`} className="card-hover group block">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="badge-primary shrink-0">{market.category}</span>
                    {getStatusBadge(market.status, market.sponsor_label || undefined)}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {market.title}
                  </h3>

                  {/* Probability Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span>YES</span>
                      <span className="font-mono text-cyan-400">{yesPct}%</span>
                      <span className="font-mono text-red-400">{noPct}%</span>
                      <span>NO</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${yesPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" aria-hidden="true" />
                      {market.total_votes} 투표
                    </span>
                    <span className={cn('flex items-center gap-1', timeLeft.className)}>
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {timeLeft.text}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
