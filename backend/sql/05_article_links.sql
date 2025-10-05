-- Article Links Schema for Bidirectional Wiki-Style Linking
-- Supports Obsidian-like [[wiki-link]] syntax with graph visualization
-- Links are classification-aware and respect security boundaries

-- Main article links table (bidirectional references)
CREATE TABLE IF NOT EXISTS article_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source article (the article containing the link)
    source_article_id UUID NOT NULL,
    source_article_type VARCHAR(50) NOT NULL CHECK (source_article_type IN ('doc', 'git')),

    -- Target article (the article being linked to)
    target_article_id UUID NOT NULL,
    target_article_type VARCHAR(50) NOT NULL CHECK (target_article_type IN ('doc', 'git')),

    -- Link metadata
    link_text TEXT, -- Original link text from [[...]] syntax
    link_type VARCHAR(50) DEFAULT 'wiki' CHECK (link_type IN ('wiki', 'mention', 'embed')),
    context_snippet TEXT, -- Surrounding text for preview (±50 chars)

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    FOREIGN KEY (source_article_type, source_article_id) REFERENCES articles(source_type, id) ON DELETE CASCADE,
    FOREIGN KEY (target_article_type, target_article_id) REFERENCES articles(source_type, id) ON DELETE CASCADE,

    -- Prevent duplicate links between same articles
    UNIQUE(source_article_type, source_article_id, target_article_type, target_article_id, link_text)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_article_links_source ON article_links(source_article_type, source_article_id);
CREATE INDEX IF NOT EXISTS idx_article_links_target ON article_links(target_article_type, target_article_id);
CREATE INDEX IF NOT EXISTS idx_article_links_bidirectional ON article_links(source_article_id, target_article_id);
CREATE INDEX IF NOT EXISTS idx_article_links_created_at ON article_links(created_at DESC);

-- Materialized view for efficient backlink queries
-- This denormalizes article metadata for fast graph queries
CREATE MATERIALIZED VIEW IF NOT EXISTS article_backlinks_view AS
SELECT
    al.id AS link_id,
    al.source_article_id,
    al.source_article_type,
    al.target_article_id,
    al.target_article_type,
    al.link_text,
    al.link_type,
    al.context_snippet,

    -- Source article metadata
    sa.title AS source_title,
    sa.full_path AS source_path,
    sa.classification_level AS source_classification,
    sa.status AS source_status,

    -- Target article metadata
    ta.title AS target_title,
    ta.full_path AS target_path,
    ta.classification_level AS target_classification,
    ta.status AS target_status,

    al.created_at
FROM article_links al
INNER JOIN articles sa ON al.source_article_type = sa.source_type AND al.source_article_id = sa.id
INNER JOIN articles ta ON al.target_article_type = ta.source_type AND al.target_article_id = ta.id
WHERE sa.status IN ('draft', 'published')  -- Only include active articles
  AND ta.status IN ('draft', 'published');

-- Index on materialized view for fast backlink lookups
CREATE INDEX IF NOT EXISTS idx_backlinks_view_target ON article_backlinks_view(target_article_type, target_article_id);
CREATE INDEX IF NOT EXISTS idx_backlinks_view_source ON article_backlinks_view(source_article_type, source_article_id);

-- Function to refresh materialized view (can be called after article updates)
CREATE OR REPLACE FUNCTION refresh_article_backlinks()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY article_backlinks_view;
END;
$$ LANGUAGE plpgsql;

-- Graph statistics table for analytics and dashboard
CREATE TABLE IF NOT EXISTS article_graph_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Article reference
    article_id UUID NOT NULL,
    article_source_type VARCHAR(50) NOT NULL CHECK (article_source_type IN ('doc', 'git')),

    -- Graph metrics
    outbound_links_count INTEGER DEFAULT 0,  -- Links from this article to others
    inbound_links_count INTEGER DEFAULT 0,   -- Links from others to this article (backlinks)
    total_degree INTEGER DEFAULT 0,          -- Total connections (in + out)
    is_orphan BOOLEAN DEFAULT FALSE,         -- No inbound or outbound links
    is_hub BOOLEAN DEFAULT FALSE,            -- Many outbound links (>10)
    is_authority BOOLEAN DEFAULT FALSE,      -- Many inbound links (>10)

    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_source_type, article_id) REFERENCES articles(source_type, id) ON DELETE CASCADE,
    UNIQUE(article_source_type, article_id)
);

-- Indexes for graph stats
CREATE INDEX IF NOT EXISTS idx_graph_stats_article ON article_graph_stats(article_source_type, article_id);
CREATE INDEX IF NOT EXISTS idx_graph_stats_orphans ON article_graph_stats(is_orphan) WHERE is_orphan = true;
CREATE INDEX IF NOT EXISTS idx_graph_stats_hubs ON article_graph_stats(is_hub) WHERE is_hub = true;
CREATE INDEX IF NOT EXISTS idx_graph_stats_authorities ON article_graph_stats(is_authority) WHERE is_authority = true;
CREATE INDEX IF NOT EXISTS idx_graph_stats_degree ON article_graph_stats(total_degree DESC);

-- Function to update graph statistics for an article
CREATE OR REPLACE FUNCTION update_article_graph_stats(p_article_id UUID, p_article_type VARCHAR(50))
RETURNS void AS $$
DECLARE
    v_outbound INTEGER;
    v_inbound INTEGER;
    v_total INTEGER;
BEGIN
    -- Count outbound links
    SELECT COUNT(*) INTO v_outbound
    FROM article_links
    WHERE source_article_type = p_article_type AND source_article_id = p_article_id;

    -- Count inbound links (backlinks)
    SELECT COUNT(*) INTO v_inbound
    FROM article_links
    WHERE target_article_type = p_article_type AND target_article_id = p_article_id;

    v_total := v_outbound + v_inbound;

    -- Insert or update stats
    INSERT INTO article_graph_stats (
        article_id, article_source_type,
        outbound_links_count, inbound_links_count, total_degree,
        is_orphan, is_hub, is_authority, calculated_at
    ) VALUES (
        p_article_id, p_article_type,
        v_outbound, v_inbound, v_total,
        (v_total = 0), (v_outbound > 10), (v_inbound > 10),
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (article_source_type, article_id)
    DO UPDATE SET
        outbound_links_count = v_outbound,
        inbound_links_count = v_inbound,
        total_degree = v_total,
        is_orphan = (v_total = 0),
        is_hub = (v_outbound > 10),
        is_authority = (v_inbound > 10),
        calculated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update graph stats when links are added/removed
CREATE OR REPLACE FUNCTION trigger_update_graph_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update stats for both source and target articles
        PERFORM update_article_graph_stats(NEW.source_article_id, NEW.source_article_type);
        PERFORM update_article_graph_stats(NEW.target_article_id, NEW.target_article_type);
    ELSIF TG_OP = 'DELETE' THEN
        -- Update stats for both source and target articles
        PERFORM update_article_graph_stats(OLD.source_article_id, OLD.source_article_type);
        PERFORM update_article_graph_stats(OLD.target_article_id, OLD.target_article_type);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Update stats for all involved articles (old and new)
        PERFORM update_article_graph_stats(OLD.source_article_id, OLD.source_article_type);
        PERFORM update_article_graph_stats(OLD.target_article_id, OLD.target_article_type);
        IF OLD.source_article_id != NEW.source_article_id OR OLD.target_article_id != NEW.target_article_id THEN
            PERFORM update_article_graph_stats(NEW.source_article_id, NEW.source_article_type);
            PERFORM update_article_graph_stats(NEW.target_article_id, NEW.target_article_type);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER article_links_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON article_links
FOR EACH ROW
EXECUTE FUNCTION trigger_update_graph_stats();
