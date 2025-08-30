-- Token Management Schema
-- Classification levels: 1-5 stars (5 = highest clearance)
-- Token hierarchy: 5-star can create 2-5 star tokens, 4-star can create 2-3 star tokens

-- Classification levels lookup table
CREATE TABLE IF NOT EXISTS classification_levels (
    level INTEGER PRIMARY KEY CHECK (level >= 1 AND level <= 5),
    name VARCHAR(20) NOT NULL,
    description TEXT,
    can_create_tokens BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert classification levels
INSERT INTO classification_levels (level, name, description, can_create_tokens) VALUES
(5, '5-Star', 'Highest classification level - can create 2-5 star tokens', TRUE),
(4, '4-Star', 'High classification level - can create 2-3 star tokens', TRUE),
(3, '3-Star', 'Medium classification level - cannot create tokens', FALSE),
(2, '2-Star', 'Low classification level - cannot create tokens', FALSE),
(1, '1-Star', 'Public/conceptual level - cannot create tokens', FALSE)
ON CONFLICT (level) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    can_create_tokens = EXCLUDED.can_create_tokens;

-- Main tokens table
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(128) NOT NULL UNIQUE, -- SHA-512 hash of the actual token
    classification_level INTEGER NOT NULL REFERENCES classification_levels(level),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    name VARCHAR(100), -- Optional human-readable name
    description TEXT, -- Optional description of token purpose
    created_by UUID REFERENCES tokens(id), -- Parent token that created this token (NULL for God token)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL means no expiration
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES tokens(id),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_classification ON tokens(classification_level);
CREATE INDEX IF NOT EXISTS idx_tokens_created_by ON tokens(created_by);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens(expires_at);

-- Token usage tracking
CREATE TABLE IF NOT EXISTS token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    request_size INTEGER,
    response_status INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_token_usage_token_id ON token_usage(token_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_endpoint ON token_usage(endpoint);