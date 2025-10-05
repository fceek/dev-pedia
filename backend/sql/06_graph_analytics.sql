-- Graph Analytics Schema
-- Adds support for graph clustering and community detection

-- Article Clusters Table
-- Stores cluster assignments for articles based on community detection algorithms
CREATE TABLE IF NOT EXISTS article_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL,
    article_source_type VARCHAR(50) NOT NULL,
    cluster_id INT NOT NULL,
    cluster_label VARCHAR(255),
    centrality_score FLOAT DEFAULT 0.0,
    algorithm VARCHAR(50) NOT NULL DEFAULT 'louvain', -- 'louvain', 'label_propagation', etc.
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_article_cluster
        FOREIGN KEY (article_source_type, article_id)
        REFERENCES articles(source_type, id)
        ON DELETE CASCADE,

    CONSTRAINT unique_article_cluster
        UNIQUE (article_source_type, article_id, algorithm)
);

-- Indexes for cluster queries
CREATE INDEX IF NOT EXISTS idx_article_clusters_cluster_id
    ON article_clusters(cluster_id, algorithm);

CREATE INDEX IF NOT EXISTS idx_article_clusters_article
    ON article_clusters(article_source_type, article_id);

CREATE INDEX IF NOT EXISTS idx_article_clusters_calculated
    ON article_clusters(calculated_at DESC);

-- Cluster Metadata Table
-- Stores information about each detected cluster/community
CREATE TABLE IF NOT EXISTS cluster_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id INT NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    size INT NOT NULL DEFAULT 0, -- Number of articles in cluster
    density FLOAT DEFAULT 0.0, -- Internal link density
    label VARCHAR(255), -- Auto-generated or manually assigned label
    description TEXT,
    representative_article_id UUID, -- Most central article in cluster
    representative_article_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_cluster_algorithm
        UNIQUE (cluster_id, algorithm)
);

CREATE INDEX IF NOT EXISTS idx_cluster_metadata_algorithm
    ON cluster_metadata(algorithm);

CREATE INDEX IF NOT EXISTS idx_cluster_metadata_size
    ON cluster_metadata(size DESC);

-- Materialized view for cluster statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS cluster_stats_view AS
SELECT
    cm.cluster_id,
    cm.algorithm,
    cm.label,
    cm.size,
    cm.density,
    COUNT(DISTINCT ac.article_id) as actual_member_count,
    AVG(ac.centrality_score) as avg_centrality,
    MAX(ac.centrality_score) as max_centrality,
    -- Get representative article info
    ra.id as representative_id,
    ra.source_type as representative_source_type,
    ra.title as representative_title,
    ra.full_path as representative_path,
    ra.classification_level as representative_classification
FROM cluster_metadata cm
LEFT JOIN article_clusters ac
    ON cm.cluster_id = ac.cluster_id AND cm.algorithm = ac.algorithm
LEFT JOIN articles ra
    ON cm.representative_article_id = ra.id
    AND cm.representative_article_type = ra.source_type
GROUP BY
    cm.cluster_id,
    cm.algorithm,
    cm.label,
    cm.size,
    cm.density,
    ra.id,
    ra.source_type,
    ra.title,
    ra.full_path,
    ra.classification_level;

-- Index for materialized view
CREATE INDEX IF NOT EXISTS idx_cluster_stats_view_cluster
    ON cluster_stats_view(cluster_id, algorithm);

-- Function to refresh cluster statistics
CREATE OR REPLACE FUNCTION refresh_cluster_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW cluster_stats_view;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cluster metadata timestamp
CREATE OR REPLACE FUNCTION update_cluster_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cluster_metadata_timestamp
    BEFORE UPDATE ON cluster_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_cluster_metadata_timestamp();
