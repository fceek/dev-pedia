package auth

import (
	"crypto/rand"
	"crypto/sha512"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"fceek/dev-pedia/backend/internal/database"
	"fceek/dev-pedia/backend/internal/models"

	"github.com/google/uuid"
)

// TokenService handles token operations
type TokenService struct {
	db *database.DB
}

// NewTokenService creates a new token service
func NewTokenService(db *database.DB) *TokenService {
	return &TokenService{db: db}
}

// GenerateToken creates a cryptographically secure random token
func (ts *TokenService) GenerateToken() (string, error) {
	// Generate 32 random bytes (256 bits)
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}

	// Convert to hex string (64 characters)
	token := hex.EncodeToString(bytes)
	return token, nil
}

// HashToken creates a SHA-512 hash of the token for storage
func (ts *TokenService) HashToken(token string) string {
	hash := sha512.Sum512([]byte(token))
	return hex.EncodeToString(hash[:])
}

// CreateToken creates a new token with the specified classification level
func (ts *TokenService) CreateToken(request models.CreateTokenRequest, creatorTokenID *uuid.UUID) (*models.TokenResponse, error) {
	// Generate the actual token
	token, err := ts.GenerateToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Hash the token for storage
	tokenHash := ts.HashToken(token)

	// Create token record
	tokenID := uuid.New()
	now := time.Now()

	// Insert into database
	query := `
		INSERT INTO tokens (
			id, token_hash, classification_level, status, name, description, 
			created_by, created_at, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err = ts.db.Exec(
		query,
		tokenID,
		tokenHash,
		request.ClassificationLevel,
		models.TokenStatusActive,
		request.Name,
		request.Description,
		creatorTokenID,
		now,
		request.ExpiresAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create token: %w", err)
	}

	// Return response with the actual token (only time it's exposed)
	return &models.TokenResponse{
		Token:       token,
		ID:          tokenID,
		Name:        request.Name,
		Description: request.Description,
		Level:       request.ClassificationLevel,
		Status:      models.TokenStatusActive,
		CreatedAt:   now,
		ExpiresAt:   request.ExpiresAt,
	}, nil
}

// ValidateToken checks if a token is valid and returns token details
func (ts *TokenService) ValidateToken(token string) (*models.Token, error) {
	tokenHash := ts.HashToken(token)

	query := `
		SELECT id, token_hash, classification_level, status, name, description,
		       created_by, created_at, expires_at, revoked_at, revoked_by, last_used_at
		FROM tokens 
		WHERE token_hash = $1
	`

	var t models.Token
	err := ts.db.QueryRow(query, tokenHash).Scan(
		&t.ID,
		&t.TokenHash,
		&t.ClassificationLevel,
		&t.Status,
		&t.Name,
		&t.Description,
		&t.CreatedBy,
		&t.CreatedAt,
		&t.ExpiresAt,
		&t.RevokedAt,
		&t.RevokedBy,
		&t.LastUsedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("token not found")
		}
		return nil, fmt.Errorf("failed to validate token: %w", err)
	}

	// Check if token is active
	if !t.IsActive() {
		return nil, fmt.Errorf("token is not active")
	}

	return &t, nil
}

// UpdateLastUsed updates the last used timestamp for a token
func (ts *TokenService) UpdateLastUsed(tokenID uuid.UUID) error {
	query := `UPDATE tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := ts.db.Exec(query, tokenID)
	if err != nil {
		return fmt.Errorf("failed to update last used timestamp: %w", err)
	}
	return nil
}

// RevokeToken revokes a token
func (ts *TokenService) RevokeToken(tokenID uuid.UUID, revokedBy *uuid.UUID) error {
	query := `
		UPDATE tokens 
		SET status = $1, revoked_at = CURRENT_TIMESTAMP, revoked_by = $2
		WHERE id = $3 AND status = $4
	`

	result, err := ts.db.Exec(query, models.TokenStatusRevoked, revokedBy, tokenID, models.TokenStatusActive)
	if err != nil {
		return fmt.Errorf("failed to revoke token: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("token not found or already revoked")
	}

	return nil
}

// ListTokens returns a list of tokens (without the actual token values)
func (ts *TokenService) ListTokens(createdBy *uuid.UUID, status string, limit int, offset int) ([]models.TokenWithLevel, error) {
	query := `
		SELECT t.id, t.classification_level, t.status, t.name, t.description,
		       t.created_by, t.created_at, t.expires_at, t.revoked_at, 
		       t.revoked_by, t.last_used_at,
		       cl.name, cl.description, cl.can_create_tokens
		FROM tokens t
		JOIN classification_levels cl ON t.classification_level = cl.level
		WHERE ($1::UUID IS NULL OR t.created_by = $1)
		  AND ($2::TEXT IS NULL OR t.status = $2)
		ORDER BY t.created_at DESC
		LIMIT $3 OFFSET $4
	`

	rows, err := ts.db.Query(query, createdBy, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list tokens: %w", err)
	}
	defer rows.Close()

	var tokens []models.TokenWithLevel
	for rows.Next() {
		var t models.TokenWithLevel
		err := rows.Scan(
			&t.ID,
			&t.ClassificationLevel,
			&t.Status,
			&t.Name,
			&t.Description,
			&t.CreatedBy,
			&t.CreatedAt,
			&t.ExpiresAt,
			&t.RevokedAt,
			&t.RevokedBy,
			&t.LastUsedAt,
			&t.LevelName,
			&t.LevelDescription,
			&t.LevelCanCreateTokens,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan token: %w", err)
		}
		tokens = append(tokens, t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating tokens: %w", err)
	}

	return tokens, nil
}

// CountTokensByCreator returns the count of tokens created by a specific user with optional status filter
func (ts *TokenService) CountTokensByCreator(createdBy *uuid.UUID, status string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM tokens
		WHERE ($1::UUID IS NULL OR created_by = $1)
		  AND ($2::TEXT IS NULL OR status = $2)
	`
	
	var count int
	err := ts.db.QueryRow(query, createdBy, status).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count tokens: %w", err)
	}
	
	return count, nil
}

// GetToken returns a specific token by ID (without the actual token value)
func (ts *TokenService) GetToken(tokenID uuid.UUID) (*models.TokenWithLevel, error) {
	query := `
		SELECT t.id, t.classification_level, t.status, t.name, t.description,
		       t.created_by, t.created_at, t.expires_at, t.revoked_at, 
		       t.revoked_by, t.last_used_at,
		       cl.name, cl.description, cl.can_create_tokens
		FROM tokens t
		JOIN classification_levels cl ON t.classification_level = cl.level
		WHERE t.id = $1
	`

	var t models.TokenWithLevel
	err := ts.db.QueryRow(query, tokenID).Scan(
		&t.ID,
		&t.ClassificationLevel,
		&t.Status,
		&t.Name,
		&t.Description,
		&t.CreatedBy,
		&t.CreatedAt,
		&t.ExpiresAt,
		&t.RevokedAt,
		&t.RevokedBy,
		&t.LastUsedAt,
		&t.LevelName,
		&t.LevelDescription,
		&t.LevelCanCreateTokens,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("token not found")
		}
		return nil, fmt.Errorf("failed to get token: %w", err)
	}

	return &t, nil
}