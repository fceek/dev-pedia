-- Audit Logging Schema
-- Track all token operations for security and compliance

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL, -- 'create_token', 'revoke_token', 'authenticate', 'failed_auth'
    actor_token_id UUID REFERENCES tokens(id), -- Token that performed the action (NULL for God token)
    target_token_id UUID REFERENCES tokens(id), -- Token that was affected (NULL for auth attempts)
    classification_level INTEGER REFERENCES classification_levels(level),
    details JSONB, -- Additional context (IP, user agent, request data, etc.)
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT, -- Error details if success = FALSE
    ip_address INET,
    user_agent TEXT,
    endpoint VARCHAR(200),
    method VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_token_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_token_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_classification ON audit_logs(classification_level);

-- Security events table for high-priority alerts
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- 'suspicious_activity', 'multiple_failed_auth', 'token_abuse'
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    related_token_id UUID REFERENCES tokens(id),
    related_audit_log_ids UUID[] DEFAULT '{}', -- Array of audit log IDs
    details JSONB,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES tokens(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_token ON security_events(related_token_id);