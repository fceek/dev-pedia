package models

import (
	"time"

	"github.com/google/uuid"
)

// ClassificationLevel represents the access level hierarchy
type ClassificationLevel struct {
	Level           int       `json:"level" db:"level"`
	Name            string    `json:"name" db:"name"`
	Description     string    `json:"description" db:"description"`
	CanCreateTokens bool      `json:"can_create_tokens" db:"can_create_tokens"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

// Token represents an access token with classification level
type Token struct {
	ID                  uuid.UUID  `json:"id" db:"id"`
	TokenHash           string     `json:"-" db:"token_hash"` // Never expose in JSON
	ClassificationLevel int        `json:"classification_level" db:"classification_level"`
	Status              string     `json:"status" db:"status"`
	Name                *string    `json:"name" db:"name"`
	Description         *string    `json:"description" db:"description"`
	CreatedBy           *uuid.UUID `json:"created_by" db:"created_by"`
	CreatedAt           time.Time  `json:"created_at" db:"created_at"`
	ExpiresAt           *time.Time `json:"expires_at" db:"expires_at"`
	RevokedAt           *time.Time `json:"revoked_at" db:"revoked_at"`
	RevokedBy           *uuid.UUID `json:"revoked_by" db:"revoked_by"`
	LastUsedAt          *time.Time `json:"last_used_at" db:"last_used_at"`
}

// TokenStatus constants
const (
	TokenStatusActive  = "active"
	TokenStatusRevoked = "revoked"
	TokenStatusExpired = "expired"
)

// TokenUsage tracks API usage per token
type TokenUsage struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	TokenID          uuid.UUID  `json:"token_id" db:"token_id"`
	Endpoint         string     `json:"endpoint" db:"endpoint"`
	Method           string     `json:"method" db:"method"`
	IPAddress        *string    `json:"ip_address" db:"ip_address"`
	UserAgent        *string    `json:"user_agent" db:"user_agent"`
	RequestSize      *int       `json:"request_size" db:"request_size"`
	ResponseStatus   *int       `json:"response_status" db:"response_status"`
	ResponseTimeMs   *int       `json:"response_time_ms" db:"response_time_ms"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
}

// TokenWithLevel combines token with its classification level details
type TokenWithLevel struct {
	Token               `json:",inline"`
	LevelName           string `json:"level_name"`
	LevelDescription    string `json:"level_description"`
	LevelCanCreateTokens bool   `json:"level_can_create_tokens"`
}

// CreateTokenRequest represents a request to create a new token
type CreateTokenRequest struct {
	ClassificationLevel int     `json:"classification_level" validate:"required,min=2,max=5"`
	Name                *string `json:"name" validate:"omitempty,max=100"`
	Description         *string `json:"description" validate:"omitempty,max=500"`
	ExpiresAt           *time.Time `json:"expires_at"`
}

// TokenResponse represents the response when creating a token (includes actual token)
type TokenResponse struct {
	Token       string    `json:"token"` // Only returned on creation
	ID          uuid.UUID `json:"id"`
	Name        *string   `json:"name"`
	Description *string   `json:"description"`
	Level       int       `json:"classification_level"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
}

// IsActive checks if token is currently active
func (t *Token) IsActive() bool {
	if t.Status != TokenStatusActive {
		return false
	}
	if t.ExpiresAt != nil && time.Now().After(*t.ExpiresAt) {
		return false
	}
	return true
}

// IsExpired checks if token has expired
func (t *Token) IsExpired() bool {
	return t.ExpiresAt != nil && time.Now().After(*t.ExpiresAt)
}

