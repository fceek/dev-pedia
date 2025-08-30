package jobs

import (
	"log"
	"time"

	"fceek/dev-pedia/backend/internal/database"
	"fceek/dev-pedia/backend/internal/models"
)

// TokenExpirationJob handles token expiration tasks
type TokenExpirationJob struct {
	db *database.DB
}

// NewTokenExpirationJob creates a new token expiration job
func NewTokenExpirationJob(db *database.DB) *TokenExpirationJob {
	return &TokenExpirationJob{db: db}
}

// MarkExpiredTokens updates all expired tokens to 'expired' status
func (tej *TokenExpirationJob) MarkExpiredTokens() error {
	query := `
		UPDATE tokens 
		SET status = $1 
		WHERE expires_at IS NOT NULL 
		  AND expires_at <= CURRENT_TIMESTAMP 
		  AND status = $2
	`

	result, err := tej.db.Exec(query, models.TokenStatusExpired, models.TokenStatusActive)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected > 0 {
		log.Printf("Marked %d tokens as expired", rowsAffected)
	}

	return nil
}

// CleanupExpiredTokens removes tokens that have been expired for a certain duration
func (tej *TokenExpirationJob) CleanupExpiredTokens(olderThan time.Duration) error {
	query := `
		DELETE FROM tokens
		WHERE status = $1
		  AND expires_at IS NOT NULL
		  AND expires_at < $2
	`

	cutoffTime := time.Now().Add(-olderThan)
	
	result, err := tej.db.Exec(query, models.TokenStatusExpired, cutoffTime)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected > 0 {
		log.Printf("Cleaned up %d expired tokens older than %v", rowsAffected, olderThan)
	}

	return nil
}