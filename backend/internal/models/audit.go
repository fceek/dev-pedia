package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// AuditLog represents an audit trail entry
type AuditLog struct {
	ID                  uuid.UUID       `json:"id" db:"id"`
	Action              string          `json:"action" db:"action"`
	ActorTokenID        *uuid.UUID      `json:"actor_token_id" db:"actor_token_id"`
	TargetTokenID       *uuid.UUID      `json:"target_token_id" db:"target_token_id"`
	ClassificationLevel *int            `json:"classification_level" db:"classification_level"`
	Details             json.RawMessage `json:"details" db:"details"`
	Success             bool            `json:"success" db:"success"`
	ErrorMessage        *string         `json:"error_message" db:"error_message"`
	IPAddress           *string         `json:"ip_address" db:"ip_address"`
	UserAgent           *string         `json:"user_agent" db:"user_agent"`
	Endpoint            *string         `json:"endpoint" db:"endpoint"`
	Method              *string         `json:"method" db:"method"`
	CreatedAt           time.Time       `json:"created_at" db:"created_at"`
}

// Audit action constants
const (
	AuditActionCreateToken    = "create_token"
	AuditActionRevokeToken    = "revoke_token"
	AuditActionAuthenticate   = "authenticate"
	AuditActionFailedAuth     = "failed_auth"
	AuditActionTokenUsage     = "token_usage"
	AuditActionListTokens     = "list_tokens"
	AuditActionViewToken      = "view_token"
	AuditActionExpireToken    = "expire_token"
	AuditActionUpdateToken    = "update_token"
)

// SecurityEvent represents a high-priority security event
type SecurityEvent struct {
	ID                   uuid.UUID         `json:"id" db:"id"`
	EventType            string            `json:"event_type" db:"event_type"`
	Severity             string            `json:"severity" db:"severity"`
	Description          string            `json:"description" db:"description"`
	RelatedTokenID       *uuid.UUID        `json:"related_token_id" db:"related_token_id"`
	RelatedAuditLogIDs   []uuid.UUID       `json:"related_audit_log_ids" db:"related_audit_log_ids"`
	Details              json.RawMessage   `json:"details" db:"details"`
	Resolved             bool              `json:"resolved" db:"resolved"`
	ResolvedAt           *time.Time        `json:"resolved_at" db:"resolved_at"`
	ResolvedBy           *uuid.UUID        `json:"resolved_by" db:"resolved_by"`
	CreatedAt            time.Time         `json:"created_at" db:"created_at"`
}

// Security event types
const (
	SecurityEventSuspiciousActivity   = "suspicious_activity"
	SecurityEventMultipleFailedAuth   = "multiple_failed_auth"
	SecurityEventTokenAbuse          = "token_abuse"
	SecurityEventUnauthorizedAccess  = "unauthorized_access"
	SecurityEventRateLimitExceeded   = "rate_limit_exceeded"
	SecurityEventPrivilegeEscalation = "privilege_escalation"
)

// Security severity levels
const (
	SeverityLow      = "low"
	SeverityMedium   = "medium"
	SeverityHigh     = "high"
	SeverityCritical = "critical"
)

// AuditLogDetails represents common details stored in audit logs
type AuditLogDetails struct {
	TokenName           *string           `json:"token_name,omitempty"`
	TargetLevel         *int              `json:"target_level,omitempty"`
	RequestPayload      interface{}       `json:"request_payload,omitempty"`
	ResponseSize        *int              `json:"response_size,omitempty"`
	ResponseTimeMs      *int              `json:"response_time_ms,omitempty"`
	AdditionalContext   map[string]interface{} `json:"additional_context,omitempty"`
}

// SecurityEventDetails represents details stored in security events
type SecurityEventDetails struct {
	FailedAttempts      *int              `json:"failed_attempts,omitempty"`
	TimeWindow          *string           `json:"time_window,omitempty"`
	AffectedEndpoints   []string          `json:"affected_endpoints,omitempty"`
	RequestPattern      *string           `json:"request_pattern,omitempty"`
	ThreatIndicators    []string          `json:"threat_indicators,omitempty"`
	RecommendedActions  []string          `json:"recommended_actions,omitempty"`
	AdditionalContext   map[string]interface{} `json:"additional_context,omitempty"`
}

// CreateAuditLogRequest represents a request to create an audit log entry
type CreateAuditLogRequest struct {
	Action              string          `json:"action" validate:"required"`
	ActorTokenID        *uuid.UUID      `json:"actor_token_id"`
	TargetTokenID       *uuid.UUID      `json:"target_token_id"`
	ClassificationLevel *int            `json:"classification_level"`
	Details             interface{}     `json:"details"`
	Success             bool            `json:"success"`
	ErrorMessage        *string         `json:"error_message"`
	IPAddress           *string         `json:"ip_address"`
	UserAgent           *string         `json:"user_agent"`
	Endpoint            *string         `json:"endpoint"`
	Method              *string         `json:"method"`
}

// CreateSecurityEventRequest represents a request to create a security event
type CreateSecurityEventRequest struct {
	EventType          string            `json:"event_type" validate:"required"`
	Severity           string            `json:"severity" validate:"required,oneof=low medium high critical"`
	Description        string            `json:"description" validate:"required"`
	RelatedTokenID     *uuid.UUID        `json:"related_token_id"`
	RelatedAuditLogIDs []uuid.UUID       `json:"related_audit_log_ids"`
	Details            interface{}       `json:"details"`
}