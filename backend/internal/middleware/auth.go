package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"fceek/dev-pedia/backend/internal/auth"
	"fceek/dev-pedia/backend/internal/models"

	"github.com/google/uuid"
)

// AuthContext key for storing auth data in request context
type AuthContext struct {
	Token               *models.Token
	ClassificationLevel int
}

type contextKey string

const AuthContextKey contextKey = "auth"

// AuthMiddleware handles token authentication
type AuthMiddleware struct {
	tokenService *auth.TokenService
}

// NewAuthMiddleware creates a new authentication middleware
func NewAuthMiddleware(tokenService *auth.TokenService) *AuthMiddleware {
	return &AuthMiddleware{
		tokenService: tokenService,
	}
}

// RequireAuth is middleware that requires valid authentication
func (am *AuthMiddleware) RequireAuth() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract token from Authorization header
			token := am.extractToken(r)
			if token == "" {
				am.respondWithError(w, http.StatusUnauthorized, "Authorization token required")
				return
			}

			// Validate token
			tokenRecord, err := am.tokenService.ValidateToken(token)
			if err != nil {
				am.respondWithError(w, http.StatusUnauthorized, "Invalid token")
				return
			}

			// Update last used timestamp (async)
			go func() {
				am.tokenService.UpdateLastUsed(tokenRecord.ID)
			}()

			// Create auth context
			authCtx := &AuthContext{
				Token:               tokenRecord,
				ClassificationLevel: tokenRecord.ClassificationLevel,
			}

			// Add auth context to request
			ctx := context.WithValue(r.Context(), AuthContextKey, authCtx)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuth is middleware that extracts auth info but doesn't require it
func (am *AuthMiddleware) OptionalAuth() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := am.extractToken(r)
			if token == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Try to validate token
			tokenRecord, err := am.tokenService.ValidateToken(token)
			if err == nil {
				// Update last used timestamp (async)
				go func() {
					am.tokenService.UpdateLastUsed(tokenRecord.ID)
				}()

				authCtx := &AuthContext{
					Token:               tokenRecord,
					ClassificationLevel: tokenRecord.ClassificationLevel,
				}
				ctx := context.WithValue(r.Context(), AuthContextKey, authCtx)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Invalid token, but optional auth, so continue without auth
			next.ServeHTTP(w, r)
		})
	}
}

// extractToken extracts the bearer token from Authorization header
func (am *AuthMiddleware) extractToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return ""
	}

	// Check for Bearer token format
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return ""
	}

	return parts[1]
}

// respondWithError sends an error response
func (am *AuthMiddleware) respondWithError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	fmt.Fprintf(w, `{"error": "%s"}`, message)
}

// GetAuthContext extracts auth context from request context
func GetAuthContext(r *http.Request) (*AuthContext, bool) {
	ctx := r.Context().Value(AuthContextKey)
	if ctx == nil {
		return nil, false
	}

	authCtx, ok := ctx.(*AuthContext)
	return authCtx, ok
}

// GetTokenID returns the token ID from auth context
func GetTokenID(r *http.Request) *uuid.UUID {
	authCtx, ok := GetAuthContext(r)
	if !ok || authCtx.Token == nil {
		return nil
	}

	return &authCtx.Token.ID
}