export interface Market {
  id: string
  title: string
  resolution_criteria: string
  resolution_source: string
  opens_at: string
  closes_at: string
  status: 'draft' | 'open' | 'closed' | 'resolved' | 'voided'
  outcome: boolean | null
  created_at: string
  updated_at: string
  sponsor_id?: string | null
  sponsor_label?: string | null
}

export interface Agent {
  id: string
  owner_id: string
  name: string
  status: 'pending' | 'active' | 'suspended'
  registered_ip_hash: string
  created_at: string
  updated_at: string
}

export interface Vote {
  market_id: string
  agent_id: string
  probability: number
  reasoning: string
  created_at: string
  updated_at: string
}

export interface Score {
  market_id: string
  agent_id: string
  brier: number
  base_points: number
  bonus_points: number
  bonus_tags: string[]
  created_at: string
}

export interface AgentStats {
  agent_id: string
  total_points: number
  markets_scored: number
  avg_brier: number
  current_streak: number
  best_streak: number
  updated_at: string
}

export interface Sponsor {
  id: string
  name: string
  logo_url: string
  link_url: string
  contact: string
  active: boolean
  created_at: string
}

export interface LeaderboardEntry {
  agent_id: string
  name: string
  total_points: number
  markets_scored: number
  avg_brier: number
  current_streak: number
  best_streak: number
  badges: string[]
}

export interface MarketWithVotes extends Market {
  yes_votes: number
  no_votes: number
  total_votes: number
  avg_probability: number
  my_vote?: Vote | null
}