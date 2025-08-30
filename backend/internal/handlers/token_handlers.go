package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"fceek/dev-pedia/backend/internal/auth"
	"fceek/dev-pedia/backend/internal/middleware"
	"fceek/dev-pedia/backend/internal/models"

	"github.com/google/uuid"
)

// TokenHandlers contains token-related HTTP handlers
type TokenHandlers struct {
	tokenService *auth.TokenService
	authorizer   *auth.TokenAuthorizer
}

// NewTokenHandlers creates a new token handlers instance
func NewTokenHandlers(tokenService *auth.TokenService) *TokenHandlers {
	return &TokenHandlers{
		tokenService: tokenService,
		authorizer:   auth.NewTokenAuthorizer(nil), // Use default rules
	}
}

// Bootstrap creates the first 5-star token using God token
// @Summary Create bootstrap token
// @Description Creates the first 5-star token using God token from environment
// @Tags tokens
// @Accept json
// @Produce json
// @Security GodToken
// @Success 201 {object} models.TokenResponse
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/bootstrap [post]
func (th *TokenHandlers) Bootstrap(w http.ResponseWriter, r *http.Request) {
	// Get God token from Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		th.respondWithError(w, http.StatusUnauthorized, "Authorization header required")
		return
	}

	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	// Use centralized authorization for bootstrap
	if err := th.authorizer.ValidateBootstrapRequest(token); err != nil {
		th.respondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	// Create 5-star token
	req := models.CreateTokenRequest{
		ClassificationLevel: 5,
		Name:                stringPtr("Bootstrap Admin Token"),
		Description:         stringPtr("Initial 5-star token created from God token"),
	}

	tokenResponse, err := th.tokenService.CreateToken(req, nil) // nil = created by God token
	if err != nil {
		th.respondWithError(w, http.StatusInternalServerError, "Failed to create bootstrap token")
		return
	}

	th.respondWithJSON(w, http.StatusCreated, tokenResponse)
}

// CreateToken creates a new token
// @Summary Create new token
// @Description Creates a new token with specified classification level
// @Tags tokens
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body models.CreateTokenRequest true "Token creation request"
// @Success 201 {object} models.TokenResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/tokens [post]
func (th *TokenHandlers) CreateToken(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		th.respondWithError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Parse request body
	var req models.CreateTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		th.respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Use centralized authorization for token creation
	if err := th.authorizer.ValidateCreateRequest(authCtx.Token, &req); err != nil {
		th.respondWithError(w, http.StatusForbidden, err.Error())
		return
	}

	// Create the token
	tokenResponse, err := th.tokenService.CreateToken(req, &authCtx.Token.ID)
	if err != nil {
		th.respondWithError(w, http.StatusInternalServerError, "Failed to create token")
		return
	}

	th.respondWithJSON(w, http.StatusCreated, tokenResponse)
}

// ListTokens lists tokens accessible to the authenticated user
// @Summary List tokens
// @Description Lists tokens that the authenticated user has access to view
// @Tags tokens
// @Produce json
// @Security Bearer
// @Param limit query int false "Maximum number of tokens to return (default: 50, max: 100)"
// @Param offset query int false "Number of tokens to skip (default: 0)"
// @Param status query string false "Filter by token status (active, revoked, expired)"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/tokens [get]
func (th *TokenHandlers) ListTokens(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		th.respondWithError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Parse query parameters
	query := r.URL.Query()
	
	limit := 50
	if l := query.Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	offset := 0
	if o := query.Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	status := query.Get("status")

	// Get tokens
	tokens, err := th.tokenService.ListTokens(nil, status, limit, offset)
	if err != nil {
		th.respondWithError(w, http.StatusInternalServerError, "Failed to list tokens")
		return
	}

	// Filter tokens based on access permissions
	var accessibleTokens []models.TokenWithLevel
	for _, token := range tokens {
		tokenModel := models.Token{
			ID:                  token.ID,
			ClassificationLevel: token.ClassificationLevel,
			Status:              token.Status,
		}

		if th.authorizer.ValidateViewRequest(authCtx.Token, tokenModel.ClassificationLevel) == nil {
			accessibleTokens = append(accessibleTokens, token)
		}
	}

	response := map[string]interface{}{
		"tokens": accessibleTokens,
		"count":  len(accessibleTokens),
	}

	th.respondWithJSON(w, http.StatusOK, response)
}

// RevokeToken revokes a token by ID
// @Summary Revoke token
// @Description Revokes an active token, making it unusable
// @Tags tokens
// @Produce json
// @Security Bearer
// @Param id path string true "Token ID to revoke"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/tokens/{id} [delete]
func (th *TokenHandlers) RevokeToken(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		th.respondWithError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Parse token ID
	tokenIDStr := r.PathValue("id")
	tokenID, err := uuid.Parse(tokenIDStr)
	if err != nil {
		th.respondWithError(w, http.StatusBadRequest, "Invalid token ID")
		return
	}

	// Get target token
	targetToken, err := th.tokenService.GetToken(tokenID)
	if err != nil {
		th.respondWithError(w, http.StatusNotFound, "Token not found")
		return
	}

	// Validate revocation
	targetTokenModel := models.Token{
		ID:                  targetToken.ID,
		ClassificationLevel: targetToken.ClassificationLevel,
		Status:              targetToken.Status,
	}

	err = th.authorizer.ValidateRevokeRequest(authCtx.Token, targetTokenModel.ClassificationLevel)
	if err != nil {
		th.respondWithError(w, http.StatusForbidden, err.Error())
		return
	}

	// Revoke token
	err = th.tokenService.RevokeToken(tokenID, &authCtx.Token.ID)
	if err != nil {
		th.respondWithError(w, http.StatusInternalServerError, "Failed to revoke token")
		return
	}

	th.respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Token revoked successfully",
		"token_id": tokenID,
	})
}

// ValidateToken validates a token and returns its details
// @Summary Validate token
// @Description Validates a token and returns its classification level and validity
// @Tags tokens
// @Produce json
// @Security Bearer
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/validate [get]
func (th *TokenHandlers) ValidateToken(w http.ResponseWriter, r *http.Request) {
	// Get auth context (token already validated by middleware)
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		th.respondWithError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Return token validation information
	response := map[string]interface{}{
		"valid":                true,
		"classification_level": authCtx.Token.ClassificationLevel,
		"token_id":            authCtx.Token.ID,
		"status":              authCtx.Token.Status,
	}

	th.respondWithJSON(w, http.StatusOK, response)
}

// GetCurrentUser returns detailed information about the current authenticated user
// @Summary Get current user info
// @Description Returns detailed information about the authenticated user including name, expiration, creator
// @Tags tokens
// @Produce json
// @Security Bearer
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/me [get]
func (th *TokenHandlers) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	// Get auth context (token already validated by middleware)
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		th.respondWithError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Build detailed user response
	response := map[string]interface{}{
		"token_id":            authCtx.Token.ID,
		"classification_level": authCtx.Token.ClassificationLevel,
		"status":              authCtx.Token.Status,
		"created_at":          authCtx.Token.CreatedAt.Format(time.RFC3339),
	}

	// Add optional fields if they exist
	if authCtx.Token.Name != nil {
		response["name"] = *authCtx.Token.Name
	}

	if authCtx.Token.Description != nil {
		response["description"] = *authCtx.Token.Description
	}

	if authCtx.Token.ExpiresAt != nil {
		response["expires_at"] = authCtx.Token.ExpiresAt.Format(time.RFC3339)
	}

	if authCtx.Token.CreatedBy != nil {
		response["created_by"] = authCtx.Token.CreatedBy.String()
	}

	if authCtx.Token.LastUsedAt != nil {
		response["last_used_at"] = authCtx.Token.LastUsedAt.Format(time.RFC3339)
	}

	th.respondWithJSON(w, http.StatusOK, response)
}

// GetTokenStats returns token creation statistics for the authenticated user
// @Summary Get token statistics
// @Description Returns current token count and maximum allowed tokens for the authenticated user
// @Tags tokens
// @Produce json
// @Security Bearer
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/tokens/stats [get]
func (th *TokenHandlers) GetTokenStats(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		th.respondWithError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Get maximum tokens allowed for this user's level
	maxTokens := th.authorizer.GetMaxTokensForLevel(authCtx.Token.ClassificationLevel)

	// Count active tokens created by this user
	activeTokens, err := th.tokenService.CountTokensByCreator(&authCtx.Token.ID, "active")
	if err != nil {
		th.respondWithError(w, http.StatusInternalServerError, "Failed to get token statistics")
		return
	}

	response := map[string]interface{}{
		"created":     activeTokens,
		"max_allowed": maxTokens,
		"can_create":  len(th.authorizer.GetAllowedCreationLevels(authCtx.Token.ClassificationLevel)) > 0,
		"level":       authCtx.Token.ClassificationLevel,
	}

	th.respondWithJSON(w, http.StatusOK, response)
}

// GetTokenName returns the name of a token by its ID
// @Summary Get token name by ID
// @Description Returns the name of a token identified by UUID (used for resolving creator names)
// @Tags tokens
// @Produce json
// @Security Bearer
// @Param id path string true "Token ID to get name for"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/tokens/{id}/name [get]
func (th *TokenHandlers) GetTokenName(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		th.respondWithError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Parse token ID
	tokenIDStr := r.PathValue("id")
	tokenID, err := uuid.Parse(tokenIDStr)
	if err != nil {
		th.respondWithError(w, http.StatusBadRequest, "Invalid token ID")
		return
	}

	// Get target token
	targetToken, err := th.tokenService.GetToken(tokenID)
	if err != nil {
		th.respondWithError(w, http.StatusNotFound, "Token not found")
		return
	}

	// Basic access control - user must be level 3+ to query token names
	if authCtx.Token.ClassificationLevel < 3 {
		th.respondWithError(w, http.StatusForbidden, "Insufficient classification level")
		return
	}

	response := map[string]interface{}{
		"token_id": targetToken.ID,
	}

	// Return name if it exists, otherwise indicate it's a system/GOD token
	if targetToken.Name != nil {
		response["name"] = *targetToken.Name
	} else {
		response["name"] = "GOD"
	}

	th.respondWithJSON(w, http.StatusOK, response)
}

// Helper methods
func (th *TokenHandlers) respondWithJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

func (th *TokenHandlers) respondWithError(w http.ResponseWriter, statusCode int, message string) {
	th.respondWithJSON(w, statusCode, map[string]string{"error": message})
}

func stringPtr(s string) *string {
	return &s
}