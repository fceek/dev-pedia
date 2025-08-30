package routes

import (
	"net/http"

	"fceek/dev-pedia/backend/internal/auth"
	"fceek/dev-pedia/backend/internal/handlers"
	"fceek/dev-pedia/backend/internal/middleware"
)

// SetupTokenRoutes configures all token-related routes
func SetupTokenRoutes(mux *http.ServeMux, tokenService *auth.TokenService, authMiddleware *middleware.AuthMiddleware) {
	// Initialize handlers
	tokenHandlers := handlers.NewTokenHandlers(tokenService)

	// Bootstrap endpoint (uses God token validation internally)
	mux.HandleFunc("POST /api/bootstrap", tokenHandlers.Bootstrap)

	// Token management endpoints
	mux.Handle("POST /api/tokens", authMiddleware.RequireAuth()(http.HandlerFunc(tokenHandlers.CreateToken)))
	mux.Handle("GET /api/tokens", authMiddleware.RequireAuth()(http.HandlerFunc(tokenHandlers.ListTokens)))
	mux.Handle("GET /api/tokens/stats", authMiddleware.RequireAuth()(http.HandlerFunc(tokenHandlers.GetTokenStats)))
	mux.Handle("DELETE /api/tokens/{id}", authMiddleware.RequireAuth()(http.HandlerFunc(tokenHandlers.RevokeToken)))
	mux.Handle("GET /api/tokens/{id}/name", authMiddleware.RequireAuth()(http.HandlerFunc(tokenHandlers.GetTokenName)))
	
	// Token validation and user info endpoints
	mux.Handle("GET /api/validate", authMiddleware.RequireAuth()(http.HandlerFunc(tokenHandlers.ValidateToken)))
	mux.Handle("GET /api/me", authMiddleware.RequireAuth()(http.HandlerFunc(tokenHandlers.GetCurrentUser)))
}