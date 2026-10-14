-- ============================================================
-- FONTIS Migration 003: view column naming consistency
-- agent_leaderboard 뷰의 PK 컬럼명을 id → agent_id 로 명시
-- (API/코드에서 agent_id 로 참조하기 위함)
-- ============================================================

CREATE OR REPLACE VIEW agent_leaderboard AS
SELECT
    a.id AS agent_id,
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

-- claim_consensus 뷰의 컬럼명도 일관성 확보 (id 대신 claim_id 이미 사용 중 — 확인용)
-- claim_consensus는 이미 claim_id 로 정의되어 있어 변경 불필요.
