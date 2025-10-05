-- Link Strength Schema
-- Adds weighted edges to the knowledge graph based on multiple factors

-- Link Strength Table
-- Stores calculated strength/weight for each link between articles
CREATE TABLE IF NOT EXISTS article_link_strength (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL,
    source_article_id UUID NOT NULL,
    source_article_type VARCHAR(50) NOT NULL,
    target_article_id UUID NOT NULL,
    target_article_type VARCHAR(50) NOT NULL,

    -- Strength components (0.0 to 1.0 each)
    base_strength FLOAT DEFAULT 1.0,           -- Base weight (always 1.0 for existence)
    shared_tags_score FLOAT DEFAULT 0.0,       -- Bonus for shared tags
    recency_score FLOAT DEFAULT 0.0,           -- Bonus for recent link creation
    bidirectional_score FLOAT DEFAULT 0.0,     -- Bonus for mutual links
    link_count_score FLOAT DEFAULT 0.0,        -- Bonus for multiple links between same articles

    -- Final calculated strength (sum of components)
    total_strength FLOAT NOT NULL DEFAULT 1.0,

    -- Normalized strength (0.0 to 1.0, relative to graph)
    normalized_strength FLOAT DEFAULT 0.5,

    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_article_link_strength
        FOREIGN KEY (link_id)
        REFERENCES article_links(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_link_strength
        UNIQUE (link_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_link_strength_link
    ON article_link_strength(link_id);

CREATE INDEX IF NOT EXISTS idx_link_strength_source
    ON article_link_strength(source_article_type, source_article_id);

CREATE INDEX IF NOT EXISTS idx_link_strength_target
    ON article_link_strength(target_article_type, target_article_id);

CREATE INDEX IF NOT EXISTS idx_link_strength_total
    ON article_link_strength(total_strength DESC);

CREATE INDEX IF NOT EXISTS idx_link_strength_calculated
    ON article_link_strength(calculated_at DESC);

-- Materialized view combining links with their strengths
CREATE MATERIALIZED VIEW IF NOT EXISTS weighted_graph_view AS
SELECT
    al.id as link_id,
    al.source_article_id,
    al.source_article_type,
    al.target_article_id,
    al.target_article_type,
    al.link_text,
    al.link_type,
    al.context_snippet,
    al.created_at,
    sa.title as source_title,
    sa.full_path as source_path,
    sa.classification_level as source_classification,
    ta.title as target_title,
    ta.full_path as target_path,
    ta.classification_level as target_classification,
    COALESCE(als.base_strength, 1.0) as base_strength,
    COALESCE(als.shared_tags_score, 0.0) as shared_tags_score,
    COALESCE(als.recency_score, 0.0) as recency_score,
    COALESCE(als.bidirectional_score, 0.0) as bidirectional_score,
    COALESCE(als.link_count_score, 0.0) as link_count_score,
    COALESCE(als.total_strength, 1.0) as total_strength,
    COALESCE(als.normalized_strength, 0.5) as normalized_strength
FROM article_links al
INNER JOIN articles sa
    ON al.source_article_type = sa.source_type AND al.source_article_id = sa.id
INNER JOIN articles ta
    ON al.target_article_type = ta.source_type AND al.target_article_id = ta.id
LEFT JOIN article_link_strength als
    ON al.id = als.link_id
WHERE sa.status IN ('draft', 'published')
  AND ta.status IN ('draft', 'published');

-- Index for materialized view
CREATE INDEX IF NOT EXISTS idx_weighted_graph_view_source
    ON weighted_graph_view(source_article_type, source_article_id);

CREATE INDEX IF NOT EXISTS idx_weighted_graph_view_target
    ON weighted_graph_view(target_article_type, target_article_id);

CREATE INDEX IF NOT EXISTS idx_weighted_graph_view_strength
    ON weighted_graph_view(total_strength DESC);

-- Function to refresh weighted graph view
CREATE OR REPLACE FUNCTION refresh_weighted_graph()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW weighted_graph_view;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate link strength for a specific link
CREATE OR REPLACE FUNCTION calculate_link_strength(p_link_id UUID)
RETURNS VOID AS $$
DECLARE
    v_source_id UUID;
    v_source_type VARCHAR(50);
    v_target_id UUID;
    v_target_type VARCHAR(50);
    v_link_created_at TIMESTAMP;
    v_shared_tags INT;
    v_total_tags INT;
    v_has_reverse_link BOOLEAN;
    v_link_count INT;
    v_days_since_creation INT;

    v_base FLOAT := 1.0;
    v_shared_tags_score FLOAT := 0.0;
    v_recency_score FLOAT := 0.0;
    v_bidirectional_score FLOAT := 0.0;
    v_link_count_score FLOAT := 0.0;
    v_total FLOAT;
BEGIN
    -- Get link details
    SELECT
        source_article_id, source_article_type,
        target_article_id, target_article_type,
        created_at
    INTO
        v_source_id, v_source_type,
        v_target_id, v_target_type,
        v_link_created_at
    FROM article_links
    WHERE id = p_link_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 1. Shared Tags Score (0.0 to 2.0)
    -- Count shared tags between source and target articles
    SELECT
        COUNT(DISTINCT st.tag_id),
        (SELECT COUNT(DISTINCT tag_id)
         FROM article_tags
         WHERE (article_type = v_source_type AND article_id = v_source_id)
            OR (article_type = v_target_type AND article_id = v_target_id))
    INTO v_shared_tags, v_total_tags
    FROM article_tags st
    INNER JOIN article_tags tt
        ON st.tag_id = tt.tag_id
    WHERE st.article_type = v_source_type AND st.article_id = v_source_id
      AND tt.article_type = v_target_type AND tt.article_id = v_target_id;

    IF v_total_tags > 0 THEN
        v_shared_tags_score := (CAST(v_shared_tags AS FLOAT) / CAST(v_total_tags AS FLOAT)) * 2.0;
    END IF;

    -- 2. Recency Score (0.0 to 1.0)
    -- More recent links get higher scores, decays over 365 days
    v_days_since_creation := EXTRACT(DAY FROM (CURRENT_TIMESTAMP - v_link_created_at));
    v_recency_score := GREATEST(0.0, 1.0 - (CAST(v_days_since_creation AS FLOAT) / 365.0));

    -- 3. Bidirectional Score (0.0 or 1.0)
    -- Bonus if there's a reverse link
    SELECT EXISTS(
        SELECT 1 FROM article_links
        WHERE source_article_type = v_target_type
          AND source_article_id = v_target_id
          AND target_article_type = v_source_type
          AND target_article_id = v_source_id
    ) INTO v_has_reverse_link;

    IF v_has_reverse_link THEN
        v_bidirectional_score := 1.0;
    END IF;

    -- 4. Link Count Score (0.0 to 1.0)
    -- Multiple links between same articles strengthen connection
    SELECT COUNT(*)
    INTO v_link_count
    FROM article_links
    WHERE (source_article_type = v_source_type AND source_article_id = v_source_id
           AND target_article_type = v_target_type AND target_article_id = v_target_id)
       OR (source_article_type = v_target_type AND source_article_id = v_target_id
           AND target_article_type = v_source_type AND target_article_id = v_source_id);

    -- Logarithmic scaling: log2(count) / 3, capped at 1.0
    v_link_count_score := LEAST(1.0, LOG(2, GREATEST(1, v_link_count)) / 3.0);

    -- Calculate total strength
    v_total := v_base + v_shared_tags_score + v_recency_score + v_bidirectional_score + v_link_count_score;

    -- Upsert link strength
    INSERT INTO article_link_strength (
        link_id,
        source_article_id, source_article_type,
        target_article_id, target_article_type,
        base_strength,
        shared_tags_score,
        recency_score,
        bidirectional_score,
        link_count_score,
        total_strength,
        normalized_strength,
        calculated_at
    ) VALUES (
        p_link_id,
        v_source_id, v_source_type,
        v_target_id, v_target_type,
        v_base,
        v_shared_tags_score,
        v_recency_score,
        v_bidirectional_score,
        v_link_count_score,
        v_total,
        0.5, -- Will be normalized in batch later
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (link_id) DO UPDATE SET
        base_strength = EXCLUDED.base_strength,
        shared_tags_score = EXCLUDED.shared_tags_score,
        recency_score = EXCLUDED.recency_score,
        bidirectional_score = EXCLUDED.bidirectional_score,
        link_count_score = EXCLUDED.link_count_score,
        total_strength = EXCLUDED.total_strength,
        calculated_at = EXCLUDED.calculated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to normalize all link strengths (0.0 to 1.0 range)
CREATE OR REPLACE FUNCTION normalize_link_strengths()
RETURNS VOID AS $$
DECLARE
    v_min_strength FLOAT;
    v_max_strength FLOAT;
BEGIN
    -- Get min and max strengths
    SELECT MIN(total_strength), MAX(total_strength)
    INTO v_min_strength, v_max_strength
    FROM article_link_strength;

    -- Avoid division by zero
    IF v_max_strength = v_min_strength THEN
        UPDATE article_link_strength SET normalized_strength = 0.5;
        RETURN;
    END IF;

    -- Normalize all strengths to 0.0-1.0 range
    UPDATE article_link_strength
    SET normalized_strength = (total_strength - v_min_strength) / (v_max_strength - v_min_strength);
END;
$$ LANGUAGE plpgsql;
