-- Article Content Secrets Schema
-- Supports inline classification of content segments within articles
-- Enables F12-attack-resistant secret content with server-side authorization

-- Article content secrets (separate from main content)
CREATE TABLE IF NOT EXISTS article_content_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL,
    article_source_type VARCHAR(50) NOT NULL CHECK (article_source_type IN ('doc', 'git')),
    secret_key VARCHAR(100) NOT NULL, -- Unique identifier for replacement (e.g., "db-prod-creds")
    classification_level INTEGER NOT NULL REFERENCES classification_levels(level),
    content TEXT NOT NULL, -- The actual classified content
    description TEXT, -- Optional description of what this secret contains
    created_by UUID REFERENCES tokens(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES tokens(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_source_type, article_id) REFERENCES articles(source_type, id) ON DELETE CASCADE,
    UNIQUE(article_source_type, article_id, secret_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_article_secrets_lookup ON article_content_secrets(article_source_type, article_id, secret_key);
CREATE INDEX IF NOT EXISTS idx_article_secrets_classification ON article_content_secrets(classification_level);
CREATE INDEX IF NOT EXISTS idx_article_secrets_article ON article_content_secrets(article_source_type, article_id);
CREATE INDEX IF NOT EXISTS idx_article_secrets_created_by ON article_content_secrets(created_by);

-- Secret access audit log (for security monitoring)
CREATE TABLE IF NOT EXISTS article_secret_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL,
    article_source_type VARCHAR(50) NOT NULL,
    secret_key VARCHAR(100) NOT NULL,
    token_id UUID NOT NULL REFERENCES tokens(id),
    access_granted BOOLEAN NOT NULL,
    user_classification_level INTEGER NOT NULL,
    required_classification_level INTEGER NOT NULL,
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_source_type, article_id) REFERENCES articles(source_type, id) ON DELETE CASCADE
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_secret_access_log_article ON article_secret_access_log(article_source_type, article_id);
CREATE INDEX IF NOT EXISTS idx_secret_access_log_token ON article_secret_access_log(token_id);
CREATE INDEX IF NOT EXISTS idx_secret_access_log_accessed_at ON article_secret_access_log(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_secret_access_log_denied ON article_secret_access_log(access_granted, accessed_at DESC) WHERE access_granted = false;