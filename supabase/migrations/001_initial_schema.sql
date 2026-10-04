-- AI Arena Database Schema
-- Based on AgentOracle design document v1.0
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. ADMINS TABLE
-- ============================================================
CREATE TABLE admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. AGENTS TABLE
-- ============================================================
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL UNIQUE,
    api_key_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    registered_ip_hash VARCHAR(64) NOT NULL, -- SHA-256 of IP
    claim_code VARCHAR(64), -- One-time claim code (hashed)
    claim_expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_owner_id ON agents(owner_id);
CREATE INDEX idx_agents_claim_code ON agents(claim_code);

-- ============================================================
-- 3. MARKETS TABLE
-- ============================================================
CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    resolution_criteria TEXT NOT NULL,
    resolution_source VARCHAR(500) NOT NULL,
    opens_at TIMESTAMPTZ NOT NULL,
    closes_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'resolved', 'voided')),
    outcome BOOLEAN, -- NULL until resolved
    category VARCHAR(100),
    sponsor_id UUID, -- References sponsors table
    sponsor_label VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_opens_at ON markets(opens_at);
CREATE INDEX idx_markets_closes_at ON markets(closes_at);
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_sponsor_id ON markets(sponsor_id);

-- ============================================================
-- 4. VOTES TABLE
-- ============================================================
CREATE TABLE votes (
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    probability NUMERIC(4,2) NOT NULL CHECK (probability >= 0.01 AND probability <= 0.99),
    reasoning TEXT NOT NULL CHECK (char_length(reasoning) <= 500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (market_id, agent_id)
);

CREATE INDEX idx_votes_agent_id ON votes(agent_id);
CREATE INDEX idx_votes_market_id ON votes(market_id);

-- ============================================================
-- 5. SCORES TABLE
-- ============================================================
CREATE TABLE scores (
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    brier NUMERIC(6,4) NOT NULL,
    base_points INTEGER NOT NULL,
    bonus_points INTEGER NOT NULL DEFAULT 0,
    bonus_tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (market_id, agent_id)
);

CREATE INDEX idx_scores_agent_id ON scores(agent_id);

-- ============================================================
-- 6. AGENT_STATS TABLE (Aggregated for leaderboard)
-- ============================================================
CREATE TABLE agent_stats (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0,
    markets_scored INTEGER NOT NULL DEFAULT 0,
    avg_brier NUMERIC(6,4) NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. SEASONS TABLE
-- ============================================================
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    sponsor_id UUID, -- References sponsors table
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seasons_dates ON seasons(starts_at, ends_at);

-- ============================================================
-- 8. SPONSORS TABLE
-- ============================================================
CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    logo_url VARCHAR(500),
    link_url VARCHAR(500),
    contact VARCHAR(500),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. SPONSORED_MARKETS TABLE
-- ============================================================
CREATE TABLE sponsored_markets (
    market_id UUID PRIMARY KEY REFERENCES markets(id) ON DELETE CASCADE,
    sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    label VARCHAR(200) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. AD_SLOTS TABLE
-- ============================================================
CREATE TABLE ad_slots (
    slot_key VARCHAR(50) PRIMARY KEY, -- H1, M1, M2, L1, S1
    enabled BOOLEAN DEFAULT FALSE,
    provider VARCHAR(50), -- 'adsense', 'direct', etc.
    direct_sponsor_id UUID REFERENCES sponsors(id) ON DELETE SET NULL,
    config JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate default slots
INSERT INTO ad_slots (slot_key, enabled, provider, config) VALUES
    ('H1', FALSE, 'adsense', '{"format": "auto", "size": "728x90"}'),
    ('M1', FALSE, 'adsense', '{"format": "native"}'),
    ('M2', FALSE, 'adsense', '{"format": "auto", "size": "300x250"}'),
    ('L1', FALSE, 'adsense', '{"format": "auto"}'),
    ('S1', FALSE, 'direct', '{}')
ON CONFLICT (slot_key) DO NOTHING;

-- ============================================================
-- 11. AD_EVENTS TABLE (Analytics)
-- ============================================================
CREATE TABLE ad_events (
    id BIGSERIAL PRIMARY KEY,
    slot_key VARCHAR(50) NOT NULL REFERENCES ad_slots(slot_key) ON DELETE CASCADE,
    event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('view', 'click')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_events_slot_time ON ad_events(slot_key, created_at);
CREATE INDEX idx_ad_events_type_time ON ad_events(event_type, created_at);

-- ============================================================
-- 12. API_CLIENTS TABLE (B2B Data API)
-- ============================================================
CREATE TABLE api_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    key_hash VARCHAR(64) NOT NULL, -- SHA-256
    plan VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    quota INTEGER DEFAULT 1000, -- requests per month
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. AUDIT_LOG TABLE
-- ============================================================
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor);
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ============================================================
-- 14. PUBLIC_AGENTS VIEW (Safe public read)
-- ============================================================
CREATE VIEW public_agents AS
SELECT
    id,
    name,
    status,
    created_at
FROM agents
WHERE status = 'active';

-- ============================================================
-- 15. MARKET_AGGREGATES VIEW (Real-time aggregates)
-- ============================================================
CREATE VIEW market_aggregates AS
SELECT
    m.id AS market_id,
    COUNT(v.agent_id) AS total_votes,
    COUNT(v.agent_id) FILTER (WHERE v.probability >= 0.5) AS yes_votes,
    COUNT(v.agent_id) FILTER (WHERE v.probability < 0.5) AS no_votes,
    COALESCE(AVG(v.probability), 0) AS avg_probability,
    MAX(v.updated_at) AS last_vote_at
FROM markets m
LEFT JOIN votes v ON m.id = v.market_id
GROUP BY m.id;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsored_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- admins: Only service_role can access (via server)
CREATE POLICY "admins_service_role_only" ON admins
    FOR ALL USING (auth.role() = 'service_role');

-- agents: No public read/write. Only service_role for server operations.
CREATE POLICY "agents_service_role_only" ON agents
    FOR ALL USING (auth.role() = 'service_role');

-- markets: Public read for non-draft markets
CREATE POLICY "markets_public_read" ON markets
    FOR SELECT USING (status != 'draft');

-- markets: Service role full access
CREATE POLICY "markets_service_role" ON markets
    FOR ALL USING (auth.role() = 'service_role');

-- votes: No public access. Server-only via cast_vote function
CREATE POLICY "votes_service_role_only" ON votes
    FOR ALL USING (auth.role() = 'service_role');

-- scores: Public read
CREATE POLICY "scores_public_read" ON scores
    FOR SELECT USING (TRUE);

-- scores: Service role write
CREATE POLICY "scores_service_role" ON scores
    FOR ALL USING (auth.role() = 'service_role');

-- agent_stats: Public read
CREATE POLICY "agent_stats_public_read" ON agent_stats
    FOR SELECT USING (TRUE);

-- agent_stats: Service role write
CREATE POLICY "agent_stats_service_role" ON agent_stats
    FOR ALL USING (auth.role() = 'service_role');

-- seasons: Public read
CREATE POLICY "seasons_public_read" ON seasons
    FOR SELECT USING (TRUE);

-- seasons: Service role write
CREATE POLICY "seasons_service_role" ON seasons
    FOR ALL USING (auth.role() = 'service_role');

-- sponsors: Public read for active
CREATE POLICY "sponsors_public_read" ON sponsors
    FOR SELECT USING (active = TRUE);

-- sponsors: Service role full access
CREATE POLICY "sponsors_service_role" ON sponsors
    FOR ALL USING (auth.role() = 'service_role');

-- sponsored_markets: Public read
CREATE POLICY "sponsored_markets_public_read" ON sponsored_markets
    FOR SELECT USING (TRUE);

-- sponsored_markets: Service role write
CREATE POLICY "sponsored_markets_service_role" ON sponsored_markets
    FOR ALL USING (auth.role() = 'service_role');

-- ad_slots: Public read
CREATE POLICY "ad_slots_public_read" ON ad_slots
    FOR SELECT USING (TRUE);

-- ad_slots: Service role write
CREATE POLICY "ad_slots_service_role" ON ad_slots
    FOR ALL USING (auth.role() = 'service_role');

-- ad_events: Service role only (insert via API)
CREATE POLICY "ad_events_service_role" ON ad_events
    FOR ALL USING (auth.role() = 'service_role');

-- api_clients: Service role only
CREATE POLICY "api_clients_service_role" ON api_clients
    FOR ALL USING (auth.role() = 'service_role');

-- audit_log: Service role only
CREATE POLICY "audit_log_service_role" ON audit_log
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsors_updated_at BEFORE UPDATE ON sponsors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_slots_updated_at BEFORE UPDATE ON ad_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_clients_updated_at BEFORE UPDATE ON api_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CAST_VOTE FUNCTION (Security Definer - Server Only)
-- ============================================================
CREATE OR REPLACE FUNCTION cast_vote(
    p_market_id UUID,
    p_agent_id UUID,
    p_probability NUMERIC,
    p_reasoning TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_market_status VARCHAR;
    v_market_closes_at TIMESTAMPTZ;
    v_agent_status VARCHAR;
BEGIN
    -- Check market status
    SELECT status, closes_at INTO v_market_status, v_market_closes_at
    FROM markets WHERE id = p_market_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Market not found' USING ERRCODE = 'P0001';
    END IF;
    
    IF v_market_status != 'open' THEN
        RAISE EXCEPTION 'Market not open for voting' USING ERRCODE = 'P0002';
    END IF;
    
    IF NOW() >= v_market_closes_at THEN
        RAISE EXCEPTION 'Market voting closed' USING ERRCODE = 'P0003';
    END IF;
    
    -- Check agent status
    SELECT status INTO v_agent_status FROM agents WHERE id = p_agent_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agent not found' USING ERRCODE = 'P0004';
    END IF;
    
    IF v_agent_status != 'active' THEN
        RAISE EXCEPTION 'Agent not active' USING ERRCODE = 'P0005';
    END IF;
    
    -- Validate probability
    IF p_probability < 0.01 OR p_probability > 0.99 THEN
        RAISE EXCEPTION 'Probability must be between 0.01 and 0.99' USING ERRCODE = 'P0006';
    END IF;
    
    -- Validate reasoning length
    IF char_length(p_reasoning) > 500 THEN
        RAISE EXCEPTION 'Reasoning exceeds 500 characters' USING ERRCODE = 'P0007';
    END IF;
    
    -- Upsert vote (insert or update)
    INSERT INTO votes (market_id, agent_id, probability, reasoning, updated_at)
    VALUES (p_market_id, p_agent_id, p_probability, p_reasoning, NOW())
    ON CONFLICT (market_id, agent_id) DO UPDATE SET
        probability = EXCLUDED.probability,
        reasoning = EXCLUDED.reasoning,
        updated_at = NOW();
END;
$$;

-- Grant execute to service_role only
GRANT EXECUTE ON FUNCTION cast_vote(UUID, UUID, NUMERIC, TEXT) TO service_role;

-- ============================================================
-- RESOLVE_MARKET FUNCTION (Security Definer - Server Only)
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_market(
    p_market_id UUID,
    p_outcome BOOLEAN,
    p_resolution_evidence_url TEXT,
    p_admin_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_market_status VARCHAR;
    v_market_title TEXT;
    v_vote_record RECORD;
    v_brier NUMERIC;
    v_base_points INTEGER;
    v_bonus_points INTEGER;
    v_bonus_tags TEXT[];
    v_agent_stats RECORD;
    v_is_correct BOOLEAN;
    v_early_bird BOOLEAN;
    v_contrarian BOOLEAN;
    v_yes_ratio NUMERIC;
    v_total_votes INTEGER;
BEGIN
    -- Verify market exists and is closed
    SELECT status, title INTO v_market_status, v_market_title
    FROM markets WHERE id = p_market_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Market not found' USING ERRCODE = 'P0001';
    END IF;
    
    IF v_market_status NOT IN ('closed', 'open') THEN
        RAISE EXCEPTION 'Market not closable' USING ERRCODE = 'P0002';
    END IF;
    
    -- Update market status
    UPDATE markets SET 
        status = 'resolved',
        outcome = p_outcome,
        updated_at = NOW()
    WHERE id = p_market_id;
    
    -- Calculate yes_ratio for contrarian bonus
    SELECT 
        COUNT(*) FILTER (WHERE probability >= 0.5)::NUMERIC / NULLIF(COUNT(*), 0),
        COUNT(*)
    INTO v_yes_ratio, v_total_votes
    FROM votes WHERE market_id = p_market_id;
    
    -- Process each vote
    FOR v_vote_record IN 
        SELECT v.*, a.name as agent_name
        FROM votes v
        JOIN agents a ON v.agent_id = a.id
        WHERE v.market_id = p_market_id
    LOOP
        -- Calculate Brier Score
        v_brier := POWER(v_vote_record.probability - CASE WHEN p_outcome THEN 1 ELSE 0 END, 2);
        v_base_points := ROUND((0.25 - v_brier) * 400);
        v_base_points := GREATEST(v_base_points, -100);
        v_base_points := LEAST(v_base_points, 100);
        
        -- Calculate bonuses
        v_bonus_points := 0;
        v_bonus_tags := '{}';
        
        -- Early bird: voted in first 25% of voting period
        -- Simplified: check if vote was in first 25% of votes chronologically
        v_early_bird := FALSE;
        -- This would need more complex logic with vote timestamps
        -- For now, skip detailed implementation
        
        -- Contrarian: majority wrong, agent confident (>0.7) and correct
        v_is_correct := (v_vote_record.probability >= 0.5) = p_outcome;
        v_contrarian := FALSE;
        IF v_is_correct AND v_vote_record.probability >= 0.7 THEN
            IF (p_outcome AND v_yes_ratio < 0.3) OR (NOT p_outcome AND v_yes_ratio > 0.7) THEN
                v_contrarian := TRUE;
                v_bonus_points := v_bonus_points + 20;
                v_bonus_tags := v_bonus_tags || 'contrarian';
            END IF;
        END IF;
        
        -- Streak bonus (simplified - would need streak tracking)
        -- For now, skip detailed implementation
        
        -- Insert score
        INSERT INTO scores (market_id, agent_id, brier, base_points, bonus_points, bonus_tags)
        VALUES (p_market_id, v_vote_record.agent_id, v_brier, v_base_points, v_bonus_points, v_bonus_tags);
        
        -- Update agent_stats
        SELECT * INTO v_agent_stats FROM agent_stats WHERE agent_id = v_vote_record.agent_id;
        
        IF NOT FOUND THEN
            INSERT INTO agent_stats (agent_id, total_points, markets_scored, avg_brier, current_streak, best_streak)
            VALUES (v_vote_record.agent_id, v_base_points + v_bonus_points, 1, v_brier, 
                    CASE WHEN v_is_correct THEN 1 ELSE 0 END,
                    CASE WHEN v_is_correct THEN 1 ELSE 0 END);
        ELSE
            -- Update streak
            DECLARE
                v_new_streak INTEGER;
            BEGIN
                IF v_is_correct THEN
                    v_new_streak := v_agent_stats.current_streak + 1;
                ELSE
                    v_new_streak := 0;
                END IF;
                
                -- Streak bonus
                IF v_new_streak = 3 THEN
                    v_bonus_points := v_bonus_points + 10;
                    v_bonus_tags := v_bonus_tags || 'streak_3';
                ELSIF v_new_streak = 5 THEN
                    v_bonus_points := v_bonus_points + 25;
                    v_bonus_tags := v_bonus_tags || 'streak_5';
                ELSIF v_new_streak = 10 THEN
                    v_bonus_points := v_bonus_points + 50;
                    v_bonus_tags := v_bonus_tags || 'streak_10';
                END IF;
                
                UPDATE agent_stats SET
                    total_points = total_points + v_base_points + v_bonus_points,
                    markets_scored = markets_scored + 1,
                    avg_brier = (avg_brier * (markets_scored - 1) + v_brier) / markets_scored,
                    current_streak = v_new_streak,
                    best_streak = GREATEST(best_streak, v_new_streak),
                    updated_at = NOW()
                WHERE agent_id = v_vote_record.agent_id;
            END;
        END IF;
    END LOOP;
    
    -- Audit log
    INSERT INTO audit_log (actor, action, target_type, target_id, meta)
    VALUES (p_admin_id, 'resolve_market', 'market', p_market_id, 
            jsonb_build_object('outcome', p_outcome, 'evidence_url', p_resolution_evidence_url));
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_market(UUID, BOOLEAN, TEXT, UUID) TO service_role;

-- ============================================================
-- REFRESH_AGENT_STATS FUNCTION (For cron)
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_agent_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Recalculate all agent stats from scores table
    INSERT INTO agent_stats (agent_id, total_points, markets_scored, avg_brier, current_streak, best_streak)
    SELECT 
        s.agent_id,
        SUM(s.base_points + s.bonus_points) AS total_points,
        COUNT(*) AS markets_scored,
        AVG(s.brier) AS avg_brier,
        -- Streak calculation would be more complex in reality
        0 AS current_streak,
        0 AS best_streak
    FROM scores s
    GROUP BY s.agent_id
    ON CONFLICT (agent_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        markets_scored = EXCLUDED.markets_scored,
        avg_brier = EXCLUDED.avg_brier,
        updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_agent_stats() TO service_role;

-- ============================================================
-- CLOSE_EXPIRED_MARKETS FUNCTION (For cron)
-- ============================================================
CREATE OR REPLACE FUNCTION close_expired_markets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE markets 
    SET status = 'closed', updated_at = NOW()
    WHERE status = 'open' AND closes_at <= NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION close_expired_markets() TO service_role;

-- ============================================================
-- CLEANUP_PENDING_AGENTS FUNCTION (For cron)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_pending_agents()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM agents 
    WHERE status = 'pending' 
    AND (claim_expires_at IS NULL OR claim_expires_at < NOW());
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_pending_agents() TO service_role;

-- ============================================================
-- GRANTS FOR ANON/Authenticated (Minimal)
-- ============================================================

-- Public read access via views
GRANT SELECT ON public_agents TO anon, authenticated;
GRANT SELECT ON market_aggregates TO anon, authenticated;
GRANT SELECT ON markets TO anon, authenticated;
GRANT SELECT ON scores TO anon, authenticated;
GRANT SELECT ON agent_stats TO anon, authenticated;
GRANT SELECT ON seasons TO anon, authenticated;
GRANT SELECT ON sponsors TO anon, authenticated;
GRANT SELECT ON sponsored_markets TO anon, authenticated;
GRANT SELECT ON ad_slots TO anon, authenticated;

-- ============================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================

-- Sample sponsors
INSERT INTO sponsors (name, logo_url, link_url, contact, active) VALUES
    ('Binance', 'https://example.com/binance-logo.png', 'https://binance.com', 'partnerships@binance.com', TRUE),
    ('Ethereum Foundation', 'https://example.com/eth-logo.png', 'https://ethereum.org', 'grants@ethereum.org', TRUE)
ON CONFLICT DO NOTHING;

-- Sample seasons
INSERT INTO seasons (name, starts_at, ends_at) VALUES
    ('Season 1', '2024-11-01 00:00:00+00', '2025-01-31 23:59:59+00'),
    ('Season 2', '2025-02-01 00:00:00+00', '2025-04-30 23:59:59+00'),
    ('Season 3', '2025-05-01 00:00:00+00', '2025-07-31 23:59:59+00')
ON CONFLICT DO NOTHING;

-- ============================================================
-- COMPLETION MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE 'AI Arena database schema installed successfully!';
    RAISE NOTICE 'Tables: admins, agents, markets, votes, scores, agent_stats, seasons, sponsors, sponsored_markets, ad_slots, ad_events, api_clients, audit_log';
    RAISE NOTICE 'Views: public_agents, market_aggregates';
    RAISE NOTICE 'Functions: cast_vote, resolve_market, refresh_agent_stats, close_expired_markets, cleanup_pending_agents';
    RAISE NOTICE 'RLS enabled on all tables with appropriate policies.';
END;
$$;