-- Article Engine Schema with Partitioning and JSONB Metadata
-- Supports heterogeneous article sources: 'doc' and 'git'

-- Main partitioned articles table
CREATE TABLE IF NOT EXISTS articles (
    id UUID DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('doc', 'git')),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(100), -- filename without extension
    full_path TEXT NOT NULL, -- /docs/getting-started/installation
    parent_path TEXT, -- /docs/getting-started (for breadcrumbs)
    content TEXT NOT NULL, -- Markdown content
    classification_level INTEGER NOT NULL REFERENCES classification_levels(level),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    
    -- Type-specific metadata as JSONB
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Audit fields
    created_by UUID REFERENCES tokens(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES tokens(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (source_type, id),
    UNIQUE (source_type, full_path)
) PARTITION BY LIST (source_type);

-- Create partitions for each source type
CREATE TABLE IF NOT EXISTS articles_doc PARTITION OF articles FOR VALUES IN ('doc');
CREATE TABLE IF NOT EXISTS articles_git PARTITION OF articles FOR VALUES IN ('git');

-- Indexes for performance
-- Base indexes on all partitions
CREATE INDEX IF NOT EXISTS idx_articles_doc_full_path ON articles_doc(full_path);
CREATE INDEX IF NOT EXISTS idx_articles_doc_parent_path ON articles_doc(parent_path);
CREATE INDEX IF NOT EXISTS idx_articles_doc_status ON articles_doc(status);
CREATE INDEX IF NOT EXISTS idx_articles_doc_classification ON articles_doc(classification_level);
CREATE INDEX IF NOT EXISTS idx_articles_doc_created_at ON articles_doc(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_git_full_path ON articles_git(full_path);
CREATE INDEX IF NOT EXISTS idx_articles_git_parent_path ON articles_git(parent_path);
CREATE INDEX IF NOT EXISTS idx_articles_git_status ON articles_git(status);
CREATE INDEX IF NOT EXISTS idx_articles_git_classification ON articles_git(classification_level);
CREATE INDEX IF NOT EXISTS idx_articles_git_created_at ON articles_git(created_at DESC);

-- JSONB metadata indexes for type-specific queries
-- Doc articles: category, excerpt
CREATE INDEX IF NOT EXISTS idx_articles_doc_category ON articles_doc((metadata->>'category'));

-- Git articles: indexes will be added when metadata fields are defined

-- Article versions for history tracking
CREATE TABLE IF NOT EXISTS article_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL,
    article_source_type VARCHAR(50) NOT NULL,
    version_number INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    change_summary TEXT,
    created_by UUID REFERENCES tokens(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_source_type, article_id) REFERENCES articles(source_type, id) ON DELETE CASCADE,
    UNIQUE(article_source_type, article_id, version_number)
);

-- Article media/assets (shared across all source types)
CREATE TABLE IF NOT EXISTS article_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL,
    article_source_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL, -- Storage path
    alt_text TEXT,
    created_by UUID REFERENCES tokens(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_source_type, article_id) REFERENCES articles(source_type, id) ON DELETE CASCADE
);

-- Global tags table (used across all source types)
CREATE TABLE IF NOT EXISTS article_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#666666', -- Hex color
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Article-tag relations (many-to-many)
CREATE TABLE IF NOT EXISTS article_tag_relations (
    article_id UUID NOT NULL,
    article_source_type VARCHAR(50) NOT NULL,
    tag_id UUID REFERENCES article_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_source_type, article_id, tag_id),
    FOREIGN KEY (article_source_type, article_id) REFERENCES articles(source_type, id) ON DELETE CASCADE
);

-- Indexes for related tables
CREATE INDEX IF NOT EXISTS idx_article_versions_article ON article_versions(article_source_type, article_id);
CREATE INDEX IF NOT EXISTS idx_article_media_article ON article_media(article_source_type, article_id);
CREATE INDEX IF NOT EXISTS idx_article_tag_relations_article ON article_tag_relations(article_source_type, article_id);

