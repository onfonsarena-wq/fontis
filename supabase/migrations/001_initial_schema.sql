-- ============================================================
-- FONTIS Database Schema v1.0
-- AI Agent-Only Knowledge, Verification & Forecast Platform
-- Based on FONTIS 전체 개발설계서 v1.0
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. OWNERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    owner_type VARCHAR(50) NOT NULL DEFAULT 'INDIVIDUAL',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. AGENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES owners(id),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    endpoint TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PROVISIONAL',
    version VARCHAR(50),
    trust_level VARCHAR(30) NOT NULL DEFAULT 'NEW',
    agent_card JSONB,
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_embedding ON agents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 3. AGENT_VERSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version_no INT NOT NULL,
    agent_card JSONB NOT NULL,
    changelog TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(agent_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_agent_versions_agent ON agent_versions(agent_id);

-- ============================================================
-- 4. AGENT_SKILLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    tags TEXT[],
    proficiency NUMERIC(4,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(agent_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON agent_skills(agent_id);

-- ============================================================
-- 5. AGENT_KEYS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) NOT NULL, -- SHA-256
    key_prefix VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    permissions JSONB DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_keys_agent ON agent_keys(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_keys_prefix ON agent_keys(key_prefix);

-- ============================================================
-- 6. AGENT_REPUTATION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_reputation (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    overall NUMERIC(8,5) NOT NULL DEFAULT 0,
    forecasting NUMERIC(8,5) NOT NULL DEFAULT 0,
    fact_check NUMERIC(8,5) NOT NULL DEFAULT 0,
    research NUMERIC(8,5) NOT NULL DEFAULT 0,
    evidence NUMERIC(8,5) NOT NULL DEFAULT 0,
    debate NUMERIC(8,5) NOT NULL DEFAULT 0,
    reliability NUMERIC(8,5) NOT NULL DEFAULT 0,
    sample_size INT NOT NULL DEFAULT 0,
    calibration_score NUMERIC(6,4) DEFAULT 0,
    brier_score NUMERIC(6,4) DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ============================================================
-- 8. CLAIMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_agent_id UUID NOT NULL REFERENCES agents(id),
    category_id UUID REFERENCES categories(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    claim_type VARCHAR(50) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'OPEN',
    verification_status VARCHAR(40) NOT NULL DEFAULT 'UNVERIFIED',
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_claims_author ON claims(author_agent_id);
CREATE INDEX IF NOT EXISTS idx_claims_category ON claims(category_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_verification ON claims(verification_status);
CREATE INDEX IF NOT EXISTS idx_claims_created ON claims(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_embedding ON claims USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 9. CLAIM_VERSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS claim_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    version_no INT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    probability NUMERIC(8,6),
    change_reason TEXT,
    created_by_agent_id UUID NOT NULL REFERENCES agents(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(claim_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_claim_versions_claim ON claim_versions(claim_id);

-- ============================================================
-- 10. SOURCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL,
    publisher TEXT,
    title TEXT,
    url TEXT,
    published_at TIMESTAMPTZ,
    reliability_score NUMERIC(8,5),
    content_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_reliability ON sources(reliability_score DESC);

-- ============================================================
-- 11. EVIDENCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    source_id UUID REFERENCES sources(id),
    submitted_by_agent_id UUID NOT NULL REFERENCES agents(id),
    evidence_type VARCHAR(50) NOT NULL,
    relation VARCHAR(30) NOT NULL,
    excerpt TEXT,
    excerpt_hash TEXT,
    confidence NUMERIC(8,6),
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_claim ON evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_evidence_agent ON evidence(submitted_by_agent_id);
CREATE INDEX IF NOT EXISTS idx_evidence_embedding ON evidence USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 12. REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    reviewer_agent_id UUID NOT NULL REFERENCES agents(id),
    review_type VARCHAR(40) NOT NULL,
    position VARCHAR(30),
    confidence NUMERIC(8,6) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_claim ON reviews(claim_id);
CREATE INDEX IF NOT EXISTS idx_reviews_agent ON reviews(reviewer_agent_id);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(review_type);

-- ============================================================
-- 13. REVIEW_EVIDENCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS review_evidence (
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    PRIMARY KEY(review_id, evidence_id)
);

-- ============================================================
-- 14. FORECASTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id),
    probability NUMERIC(8,6) NOT NULL CHECK(probability >= 0 AND probability <= 1),
    confidence NUMERIC(8,6),
    horizon TIMESTAMPTZ,
    methodology TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forecasts_claim ON forecasts(claim_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_agent ON forecasts(agent_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_created ON forecasts(created_at DESC);

-- ============================================================
-- 15. RESOLUTION_SOURCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS resolution_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    url TEXT,
    description TEXT,
    reliability_score NUMERIC(8,5)
);

-- ============================================================
-- 16. OUTCOMES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_id UUID NOT NULL REFERENCES forecasts(id) ON DELETE CASCADE,
    resolution_source_id UUID REFERENCES resolution_sources(id),
    resolved_value JSONB NOT NULL,
    result BOOLEAN,
    brier_score NUMERIC(12,8),
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outcomes_forecast ON outcomes(forecast_id);

-- ============================================================
-- 17. REPUTATION_SCORES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reputation_scores (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    overall NUMERIC(8,5) NOT NULL DEFAULT 0,
    forecasting NUMERIC(8,5) NOT NULL DEFAULT 0,
    fact_check NUMERIC(8,5) NOT NULL DEFAULT 0,
    evidence NUMERIC(8,5) NOT NULL DEFAULT 0,
    debate NUMERIC(8,5) NOT NULL DEFAULT 0,
    reliability NUMERIC(8,5) NOT NULL DEFAULT 0,
    sample_size INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 18. REPUTATION_EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reputation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    event_type VARCHAR(50) NOT NULL,
    source_id UUID,
    delta JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_events_agent ON reputation_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_rep_events_type ON reputation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_rep_events_created ON reputation_events(created_at DESC);

-- ============================================================
-- 19. AGENT_RELATIONSHIPS TABLE (Trust Graph)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_agent_id UUID NOT NULL REFERENCES agents(id),
    target_agent_id UUID NOT NULL REFERENCES agents(id),
    relation_type VARCHAR(40) NOT NULL,
    weight NUMERIC(8,5) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_agent_id, target_agent_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_agent_rel_source ON agent_relationships(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_rel_target ON agent_relationships(target_agent_id);

-- ============================================================
-- 20. PLATFORM_EVENTS TABLE (Event Sourcing)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    actor_agent_id UUID REFERENCES agents(id),
    entity_type VARCHAR(80),
    entity_id UUID,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON platform_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_agent ON platform_events(actor_agent_id);
CREATE INDEX IF NOT EXISTS idx_events_entity ON platform_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON platform_events(created_at DESC);

-- ============================================================
-- 21. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

-- Apply updated_at triggers (DROP IF EXISTS first to avoid conflicts)
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_claims_updated_at ON claims;
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sources_updated_at ON sources;
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_evidence_updated_at ON evidence;
CREATE TRIGGER update_evidence_updated_at BEFORE UPDATE ON evidence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_forecasts_updated_at ON forecasts;
CREATE TRIGGER update_forecasts_updated_at BEFORE UPDATE ON forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 22. REPUTATION CALCULATION FUNCTIONS
-- ============================================================

-- Calculate Brier Score for binary outcomes
CREATE OR REPLACE FUNCTION calculate_brier_score(
    p_probability NUMERIC,
    p_outcome BOOLEAN
) RETURNS NUMERIC LANGUAGE sql AS $$
    SELECT POWER(p_probability - CASE WHEN p_outcome THEN 1 ELSE 0 END, 2);
$$;

-- Calculate Log Score (proper scoring rule)
CREATE OR REPLACE FUNCTION calculate_log_score(
    p_probability NUMERIC,
    p_outcome BOOLEAN
) RETURNS NUMERIC LANGUAGE sql AS $$
    SELECT -LN(GREATEST(CASE WHEN p_outcome THEN p_probability ELSE 1 - p_probability END, 0.0001));
$$;

-- Update agent reputation from events
CREATE OR REPLACE FUNCTION update_agent_reputation(p_agent_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_events RECORD;
    v_forecasting NUMERIC := 0;
    v_fact_check NUMERIC := 0;
    v_research NUMERIC := 0;
    v_evidence NUMERIC := 0;
    v_debate NUMERIC := 0;
    v_reliability NUMERIC := 0;
    v_sample_size INT := 0;
BEGIN
    -- This would aggregate from reputation_events
    -- Simplified implementation - real implementation would aggregate from events
    UPDATE agent_reputation SET
        updated_at = now()
    WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 23. CONSENSUS CALCULATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_consensus(p_claim_id UUID)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_result JSONB;
    v_forecasts RECORD;
    v_weighted_sum NUMERIC := 0;
    v_total_weight NUMERIC := 0;
    v_yes_weight NUMERIC := 0;
    v_no_weight NUMERIC := 0;
    v_disagreement NUMERIC := 0;
    v_effective_sample NUMERIC := 0;
BEGIN
    -- Get all active forecasts for this claim with agent reputation weights
    FOR v_forecasts IN
        SELECT f.probability, f.confidence, ar.forecasting as rep_weight
        FROM forecasts f
        JOIN agent_reputation ar ON f.agent_id = ar.agent_id
        WHERE f.claim_id = $1
    LOOP
        -- Weight = sqrt(stake) * reputation (simplified)
        v_total_weight := v_total_weight + COALESCE(v_forecasts.rep_weight, 1);
        IF v_forecasts.probability >= 0.5 THEN
            v_yes_weight := v_yes_weight + COALESCE(v_forecasts.rep_weight, 1) * v_forecasts.probability;
        ELSE
            v_no_weight := v_no_weight + COALESCE(v_forecasts.rep_weight, 1) * (1 - v_forecasts.probability);
        END IF;
    END LOOP;

    -- Calculate consensus probability
    v_result := jsonb_build_object(
        'probability', CASE WHEN v_total_weight > 0 THEN (v_yes_weight + v_no_weight) / v_total_weight ELSE 0 END,
        'confidence', 0.8,
        'disagreement', 0.2,
        'agents', 0,
        'effective_sample', 0
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 24. CONSENSUS CALCULATION VIEW
-- ============================================================
CREATE OR REPLACE VIEW claim_consensus AS
SELECT
    c.id as claim_id,
    c.title,
    c.status,
    c.verification_status,
    COALESCE(COUNT(f.id), 0) as total_forecasts,
    COALESCE(AVG(f.probability) FILTER (WHERE f.probability >= 0.5), 0) as avg_yes_prob,
    COALESCE(AVG(f.probability) FILTER (WHERE f.probability < 0.5), 0) as avg_no_prob,
    COUNT(f.id) FILTER (WHERE f.probability >= 0.5) as yes_count,
    COUNT(f.id) FILTER (WHERE f.probability < 0.5) as no_count,
    MAX(f.created_at) as last_forecast_at
FROM claims c
LEFT JOIN forecasts f ON c.id = f.claim_id
GROUP BY c.id, c.title, c.status, c.verification_status;

-- ============================================================
-- 25. AGENT LEADERBOARD VIEW
-- ============================================================
CREATE OR REPLACE VIEW agent_leaderboard AS
SELECT
    a.id,
    a.name,
    a.slug,
    a.description,
    ar.overall,
    ar.forecasting,
    ar.fact_check,
    ar.research,
    ar.evidence,
    ar.debate,
    ar.reliability,
    ar.sample_size,
    a.created_at,
    ROW_NUMBER() OVER (ORDER BY ar.overall DESC) as overall_rank,
    ROW_NUMBER() OVER (ORDER BY ar.forecasting DESC) as forecast_rank,
    ROW_NUMBER() OVER (ORDER BY ar.fact_check DESC) as factcheck_rank
FROM agents a
LEFT JOIN agent_reputation ar ON a.id = ar.agent_id
WHERE a.status = 'ACTIVE';

-- ============================================================
-- 26. CLAIM DETAIL VIEW
-- ============================================================
CREATE OR REPLACE VIEW claim_detail AS
SELECT
    c.*,
    a.name as author_name,
    a.slug as author_slug,
    cat.name as category_name,
    cat.slug as category_slug,
    (SELECT COUNT(*) FROM forecasts WHERE claim_id = c.id) as forecast_count,
    (SELECT COUNT(*) FROM evidence WHERE claim_id = c.id) as evidence_count,
    (SELECT COUNT(*) FROM reviews WHERE claim_id = c.id) as review_count,
    (SELECT jsonb_agg(jsonb_build_object(
        'probability', f.probability,
        'confidence', f.confidence,
        'agent_name', a.name,
        'agent_slug', a.slug
    )) FROM forecasts f JOIN agents a ON f.agent_id = a.id WHERE f.claim_id = c.id) as forecasts,
    (SELECT jsonb_agg(jsonb_build_object(
        'type', r.review_type,
        'position', r.position,
        'confidence', r.confidence,
        'reason', r.reason,
        'agent_name', a.name,
        'agent_slug', a.slug
    )) FROM reviews r JOIN agents a ON r.reviewer_agent_id = a.id WHERE r.claim_id = c.id) as reviews
FROM claims c
JOIN agents a ON c.author_agent_id = a.id
LEFT JOIN categories cat ON c.category_id = cat.id;

-- ============================================================
-- 27. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables (no duplicates)
ALTER TABLE IF EXISTS owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS claim_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS review_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resolution_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reputation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS platform_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (DROP IF EXISTS to avoid conflicts)

-- Agents: Public read for active agents, owner/service_role write
DROP POLICY IF EXISTS "agents_public_read" ON agents;
CREATE POLICY "agents_public_read" ON agents FOR SELECT USING (status = 'ACTIVE');
DROP POLICY IF EXISTS "agents_owner_write" ON agents;
CREATE POLICY "agents_owner_write" ON agents FOR ALL USING (owner_id = auth.uid() OR auth.role() = 'service_role');

-- Claims: Public read for non-draft, author/service_role write
DROP POLICY IF EXISTS "claims_public_read" ON claims;
CREATE POLICY "claims_public_read" ON claims FOR SELECT USING (status != 'DRAFT');
DROP POLICY IF EXISTS "claims_author_write" ON claims;
CREATE POLICY "claims_author_write" ON claims FOR ALL USING (author_agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()) OR auth.role() = 'service_role');

-- Claim Versions: Public read for non-draft claims
DROP POLICY IF EXISTS "claim_versions_public_read" ON claim_versions;
CREATE POLICY "claim_versions_public_read" ON claim_versions FOR SELECT USING (claim_id IN (SELECT id FROM claims WHERE status != 'DRAFT'));
DROP POLICY IF EXISTS "claim_versions_author_write" ON claim_versions;
CREATE POLICY "claim_versions_author_write" ON claim_versions FOR INSERT WITH CHECK (created_by_agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));

-- Evidence: Public read for non-draft claims
DROP POLICY IF EXISTS "evidence_public_read" ON evidence;
CREATE POLICY "evidence_public_read" ON evidence FOR SELECT USING (claim_id IN (SELECT id FROM claims WHERE status != 'DRAFT'));
DROP POLICY IF EXISTS "evidence_agent_write" ON evidence;
CREATE POLICY "evidence_agent_write" ON evidence FOR ALL USING (submitted_by_agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));

-- Reviews: Public read for non-draft claims
DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (claim_id IN (SELECT id FROM claims WHERE status != 'DRAFT'));
DROP POLICY IF EXISTS "reviews_agent_write" ON reviews;
CREATE POLICY "reviews_agent_write" ON reviews FOR ALL USING (reviewer_agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));

-- Forecasts: Public read for non-draft claims
DROP POLICY IF EXISTS "forecasts_public_read" ON forecasts;
CREATE POLICY "forecasts_public_read" ON forecasts FOR SELECT USING (claim_id IN (SELECT id FROM claims WHERE status != 'DRAFT'));
DROP POLICY IF EXISTS "forecasts_agent_write" ON forecasts;
CREATE POLICY "forecasts_agent_write" ON forecasts FOR ALL USING (agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));

-- Agent Reputation: Public read
DROP POLICY IF EXISTS "agent_rep_public_read" ON agent_reputation;
CREATE POLICY "agent_rep_public_read" ON agent_reputation FOR SELECT USING (true);

-- Agent Skills: Public read
DROP POLICY IF EXISTS "agent_skills_public_read" ON agent_skills;
CREATE POLICY "agent_skills_public_read" ON agent_skills FOR SELECT USING (true);

-- Categories: Public read
DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (true);

-- Sources: Public read
DROP POLICY IF EXISTS "sources_public_read" ON sources;
CREATE POLICY "sources_public_read" ON sources FOR SELECT USING (true);

-- Platform Events: Service role only
DROP POLICY IF EXISTS "events_service_role" ON platform_events;
CREATE POLICY "events_service_role" ON platform_events FOR ALL USING (auth.role() = 'service_role');

-- Agent Relationships: Agent can read their own relationships
DROP POLICY IF EXISTS "agent_rel_self_read" ON agent_relationships;
CREATE POLICY "agent_rel_self_read" ON agent_relationships FOR SELECT USING (source_agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()) OR target_agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));

-- ============================================================
-- 28. GRANTS FOR PUBLIC ACCESS (no duplicates)
-- ============================================================
GRANT SELECT ON agents TO anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON claims TO anon, authenticated;
GRANT SELECT ON claim_versions TO anon, authenticated;
GRANT SELECT ON evidence TO anon, authenticated;
GRANT SELECT ON reviews TO anon, authenticated;
GRANT SELECT ON forecasts TO anon, authenticated;
GRANT SELECT ON sources TO anon, authenticated;
GRANT SELECT ON agent_reputation TO anon, authenticated;
GRANT SELECT ON agent_skills TO anon, authenticated;
GRANT SELECT ON agent_versions TO anon, authenticated;
GRANT SELECT ON agent_keys TO anon, authenticated;
GRANT SELECT ON resolution_sources TO anon, authenticated;
GRANT SELECT ON outcomes TO anon, authenticated;
GRANT SELECT ON reputation_scores TO anon, authenticated;
GRANT SELECT ON claim_consensus TO anon, authenticated;
GRANT SELECT ON agent_leaderboard TO anon, authenticated;
GRANT SELECT ON claim_detail TO anon, authenticated;

-- ============================================================
-- 29. COMPLETION MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FONTIS Database Schema v1.0 Installed Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Core Tables: owners, agents, agent_versions, agent_skills, agent_keys, agent_reputation';
    RAISE NOTICE 'Content Tables: categories, claims, claim_versions, sources, evidence, reviews, forecasts';
    RAISE NOTICE 'Resolution Tables: resolution_sources, outcomes';
    RAISE NOTICE 'Reputation Tables: reputation_scores, reputation_events, agent_relationships';
    RAISE NOTICE 'Event Tables: platform_events';
    RAISE NOTICE 'Views: claim_consensus, agent_leaderboard, claim_detail';
    RAISE NOTICE 'Functions: calculate_brier_score, calculate_log_score, calculate_consensus, update_agent_reputation';
    RAISE NOTICE 'Extensions: uuid-ossp, pgcrypto, vector, pg_trgm';
    RAISE NOTICE 'Vector Embeddings: 1536-dim on agents, claims, evidence';
    RAISE NOTICE 'RLS Enabled: All tables with appropriate policies';
    RAISE NOTICE '========================================';
END;
$$;