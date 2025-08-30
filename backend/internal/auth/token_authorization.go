package auth

import (
	"fmt"
	"os"

	"fceek/dev-pedia/backend/internal/models"
)

// TokenOperation represents different operations that can be performed on tokens
type TokenOperation string

const (
	TokenOperationCreate TokenOperation = "create"
	TokenOperationList   TokenOperation = "list"
	TokenOperationRevoke TokenOperation = "revoke"
	TokenOperationView   TokenOperation = "view"
)

// TokenAuthorizationRules defines the centralized authorization rules for token management
type TokenAuthorizationRules struct {
	// CanCreateTokensByLevel defines which token levels can create new tokens
	// Key: creator token level, Value: slice of target levels they can create
	CanCreateTokensByLevel map[int][]int

	// CanRevokeTokensByLevel defines which token levels can revoke tokens created by which levels
	// Key: revoker token level, Value: slice of creator levels whose tokens they can revoke
	CanRevokeTokensByLevel map[int][]int

	// CanViewTokensByLevel defines which token levels can view tokens created by which levels
	// Key: viewer token level, Value: slice of creator levels whose tokens they can view
	CanViewTokensByLevel map[int][]int

	// RequireGodTokenForBootstrap defines if bootstrap operation requires God token
	RequireGodTokenForBootstrap bool

	// MaxTokensPerLevel defines maximum number of active tokens each level can create
	// Key: token level, Value: maximum active tokens (-1 = unlimited)
	MaxTokensPerLevel map[int]int

	// DefaultTokenExpiryDays defines default expiry in days for tokens created by each level
	// Key: creator token level, Value: default expiry days (0 = no expiry)
	DefaultTokenExpiryDays map[int]int
}

// DefaultTokenAuthorizationRules returns the default authorization rules for tokens
func DefaultTokenAuthorizationRules() *TokenAuthorizationRules {
	return &TokenAuthorizationRules{
		// Token creation permissions:
		// Level 5: can create tokens of level 2,3,4,5
		// Level 4: can create tokens of level 2,3
		// Level 3,2,1: cannot create tokens
		CanCreateTokensByLevel: map[int][]int{
			5: {2, 3, 4, 5},
			4: {2, 3},
			3: {},
			2: {},
			1: {},
		},

		// Token revocation permissions (only levels that can create tokens can revoke):
		// Level 5: can revoke tokens created by level 4,5 (the token-creating levels)
		// Level 4: can revoke tokens created by level 4 (only their own level)
		// Level 3,2,1: cannot revoke tokens
		CanRevokeTokensByLevel: map[int][]int{
			5: {4, 5},
			4: {4},
			3: {},
			2: {},
			1: {},
		},

		// Token viewing permissions (can view tokens created by token-creating levels):
		// Level 5: can view tokens created by level 4,5
		// Level 4: can view tokens created by level 4,5
		// Level 3: can view tokens created by level 4,5 (read-only access)
		// Level 2: cannot view any tokens (most restrictive)
		// Level 1: cannot view any tokens (most restrictive)
		CanViewTokensByLevel: map[int][]int{
			5: {4, 5},
			4: {4, 5},
			3: {4, 5},
			2: {},
			1: {},
		},

		// Bootstrap requires God token
		RequireGodTokenForBootstrap: true,

		// Token creation limits (only for levels that can create):
		// Level 5: unlimited tokens
		// Level 4: maximum 3 active tokens
		// Level 3,2,1: cannot create tokens (0)
		MaxTokensPerLevel: map[int]int{
			5: -1, // Unlimited
			4: 3,  // Maximum 3 tokens
			3: 0,  // Cannot create
			2: 0,  // Cannot create
			1: 0,  // Cannot create
		},

		// Default expiry settings (only for levels that can create tokens):
		// Level 5: no expiry by default
		// Level 4: 90 days default expiry
		DefaultTokenExpiryDays: map[int]int{
			5: 0,  // No expiry
			4: 90, // 90 days
			// No entries for 3,2,1 since they cannot create tokens
		},
	}
}

// TokenAuthorizer handles authorization checks for token operations
type TokenAuthorizer struct {
	rules *TokenAuthorizationRules
}

// NewTokenAuthorizer creates a new token authorizer with the given rules
func NewTokenAuthorizer(rules *TokenAuthorizationRules) *TokenAuthorizer {
	if rules == nil {
		rules = DefaultTokenAuthorizationRules()
	}
	return &TokenAuthorizer{rules: rules}
}

// CanCreateToken checks if a token can create a new token of the specified level
func (a *TokenAuthorizer) CanCreateToken(creatorLevel int, targetLevel int) bool {
	allowedLevels, exists := a.rules.CanCreateTokensByLevel[creatorLevel]
	if !exists {
		return false
	}

	for _, allowedLevel := range allowedLevels {
		if allowedLevel == targetLevel {
			return true
		}
	}
	return false
}

// CanRevokeToken checks if a token can revoke tokens created by a specific level
func (a *TokenAuthorizer) CanRevokeToken(revokerLevel int, creatorLevel int) bool {
	allowedCreatorLevels, exists := a.rules.CanRevokeTokensByLevel[revokerLevel]
	if !exists {
		return false
	}

	for _, allowedCreatorLevel := range allowedCreatorLevels {
		if allowedCreatorLevel == creatorLevel {
			return true
		}
	}
	return false
}

// CanViewTokens checks if a token can view tokens created by a specific level
func (a *TokenAuthorizer) CanViewTokens(viewerLevel int, creatorLevel int) bool {
	allowedCreatorLevels, exists := a.rules.CanViewTokensByLevel[viewerLevel]
	if !exists {
		return false
	}

	for _, allowedCreatorLevel := range allowedCreatorLevels {
		if allowedCreatorLevel == creatorLevel {
			return true
		}
	}
	return false
}

// ValidateGodToken validates the God token against environment variable
func (a *TokenAuthorizer) ValidateGodToken(providedToken string) bool {
	expectedGodToken := os.Getenv("GOD_TOKEN")
	if expectedGodToken == "" {
		return false // No God token configured
	}
	return providedToken == expectedGodToken
}

// CanBootstrap checks if bootstrap operation is allowed
func (a *TokenAuthorizer) CanBootstrap(providedGodToken string) bool {
	if a.rules.RequireGodTokenForBootstrap {
		return a.ValidateGodToken(providedGodToken)
	}
	return true
}

// GetMaxTokensForLevel returns the maximum number of tokens a level can create
func (a *TokenAuthorizer) GetMaxTokensForLevel(level int) int {
	if max, exists := a.rules.MaxTokensPerLevel[level]; exists {
		return max
	}
	return 0 // Default: cannot create tokens
}

// GetDefaultExpiryDays returns the default expiry days for tokens created by a level
func (a *TokenAuthorizer) GetDefaultExpiryDays(creatorLevel int) int {
	if days, exists := a.rules.DefaultTokenExpiryDays[creatorLevel]; exists {
		return days
	}
	return 30 // Fallback default: 30 days
}

// ValidateCreateRequest validates a create token request against authorization rules
func (a *TokenAuthorizer) ValidateCreateRequest(creatorToken *models.Token, req *models.CreateTokenRequest) error {
	// Check if creator token can create tokens of the requested level
	if !a.CanCreateToken(creatorToken.ClassificationLevel, req.ClassificationLevel) {
		allowedLevels := a.rules.CanCreateTokensByLevel[creatorToken.ClassificationLevel]
		if len(allowedLevels) == 0 {
			return fmt.Errorf("level %d tokens cannot create new tokens", creatorToken.ClassificationLevel)
		}
		return fmt.Errorf("level %d tokens can only create tokens of levels %v", creatorToken.ClassificationLevel, allowedLevels)
	}

	// Check token creation limits
	maxTokens := a.GetMaxTokensForLevel(creatorToken.ClassificationLevel)
	if maxTokens == 0 {
		return fmt.Errorf("level %d tokens cannot create new tokens", creatorToken.ClassificationLevel)
	}
	// Note: Actual count check would need to be implemented in service layer

	return nil
}

// ValidateRevokeRequest validates a revoke token request
func (a *TokenAuthorizer) ValidateRevokeRequest(revokerToken *models.Token, targetTokenCreatorLevel int) error {
	if !a.CanRevokeToken(revokerToken.ClassificationLevel, targetTokenCreatorLevel) {
		allowedCreatorLevels := a.rules.CanRevokeTokensByLevel[revokerToken.ClassificationLevel]
		if len(allowedCreatorLevels) == 0 {
			return fmt.Errorf("level %d tokens cannot revoke any tokens", revokerToken.ClassificationLevel)
		}
		return fmt.Errorf("level %d tokens can only revoke tokens created by levels %v", revokerToken.ClassificationLevel, allowedCreatorLevels)
	}
	return nil
}

// ValidateViewRequest validates if a token can view another token
func (a *TokenAuthorizer) ValidateViewRequest(viewerToken *models.Token, targetTokenCreatorLevel int) error {
	if !a.CanViewTokens(viewerToken.ClassificationLevel, targetTokenCreatorLevel) {
		return fmt.Errorf("insufficient permissions to view this token")
	}
	return nil
}

// ValidateListRequest validates if a token can list tokens and returns allowed creator levels
func (a *TokenAuthorizer) ValidateListRequest(viewerToken *models.Token) ([]int, error) {
	allowedCreatorLevels, exists := a.rules.CanViewTokensByLevel[viewerToken.ClassificationLevel]
	if !exists || len(allowedCreatorLevels) == 0 {
		return nil, fmt.Errorf("level %d tokens cannot view any tokens", viewerToken.ClassificationLevel)
	}
	return allowedCreatorLevels, nil
}

// ValidateBootstrapRequest validates bootstrap token creation with God token
func (a *TokenAuthorizer) ValidateBootstrapRequest(providedGodToken string) error {
	if !a.CanBootstrap(providedGodToken) {
		if a.rules.RequireGodTokenForBootstrap {
			return fmt.Errorf("bootstrap operation requires valid GOD_TOKEN from environment")
		}
		return fmt.Errorf("bootstrap operation not allowed")
	}
	return nil
}

// GetRules returns a copy of the current authorization rules
func (a *TokenAuthorizer) GetRules() *TokenAuthorizationRules {
	// Return a deep copy to prevent external modification
	rulesCopy := *a.rules

	// Deep copy the maps
	rulesCopy.CanCreateTokensByLevel = make(map[int][]int)
	for k, v := range a.rules.CanCreateTokensByLevel {
		rulesCopy.CanCreateTokensByLevel[k] = make([]int, len(v))
		copy(rulesCopy.CanCreateTokensByLevel[k], v)
	}

	rulesCopy.CanRevokeTokensByLevel = make(map[int][]int)
	for k, v := range a.rules.CanRevokeTokensByLevel {
		rulesCopy.CanRevokeTokensByLevel[k] = make([]int, len(v))
		copy(rulesCopy.CanRevokeTokensByLevel[k], v)
	}

	rulesCopy.CanViewTokensByLevel = make(map[int][]int)
	for k, v := range a.rules.CanViewTokensByLevel {
		rulesCopy.CanViewTokensByLevel[k] = make([]int, len(v))
		copy(rulesCopy.CanViewTokensByLevel[k], v)
	}

	rulesCopy.MaxTokensPerLevel = make(map[int]int)
	for k, v := range a.rules.MaxTokensPerLevel {
		rulesCopy.MaxTokensPerLevel[k] = v
	}

	rulesCopy.DefaultTokenExpiryDays = make(map[int]int)
	for k, v := range a.rules.DefaultTokenExpiryDays {
		rulesCopy.DefaultTokenExpiryDays[k] = v
	}

	return &rulesCopy
}

// UpdateRules allows updating the authorization rules at runtime
func (a *TokenAuthorizer) UpdateRules(newRules *TokenAuthorizationRules) {
	if newRules != nil {
		a.rules = newRules
	}
}

// GetAllowedCreationLevels returns the levels a token can create
func (a *TokenAuthorizer) GetAllowedCreationLevels(creatorLevel int) []int {
	if levels, exists := a.rules.CanCreateTokensByLevel[creatorLevel]; exists {
		return levels
	}
	return []int{}
}
