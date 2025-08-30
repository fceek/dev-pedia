package auth

import (
	"fmt"

	"fceek/dev-pedia/backend/internal/models"
)

// ArticleOperation represents different operations that can be performed on articles
type ArticleOperation string

const (
	ArticleOperationCreate ArticleOperation = "create"
	ArticleOperationRead   ArticleOperation = "read"
	ArticleOperationUpdate ArticleOperation = "update"
	ArticleOperationDelete ArticleOperation = "delete"
	ArticleOperationSetClassification ArticleOperation = "set_classification"
)

// ArticleAuthorizationRules defines the centralized authorization rules for articles
type ArticleAuthorizationRules struct {
	// MinLevelForCreate defines the minimum token level required to create articles
	MinLevelForCreate int

	// MinLevelForDelete defines the minimum token level required to delete articles
	MinLevelForDelete int

	// AllowEditByLevel defines which token levels can edit articles created by which levels
	// Key: token level, Value: slice of creator levels that this token level can edit
	AllowEditByLevel map[int][]int

	// MaxClassificationByLevel defines the maximum classification level each token level can assign
	// Key: token level, Value: maximum classification level they can set
	// If value is 0, that level cannot set any classification (read-only)
	MaxClassificationByLevel map[int]int
}

// DefaultArticleAuthorizationRules returns the default authorization rules
func DefaultArticleAuthorizationRules() *ArticleAuthorizationRules {
	return &ArticleAuthorizationRules{
		// Only level 3,4,5 tokens can create articles
		MinLevelForCreate: 3,
		
		// Only level 5 tokens can delete articles
		MinLevelForDelete: 5,
		
		// Edit permissions:
		// Level 5: can edit articles created by any level (1,2,3,4,5)
		// Level 4: can edit articles created by level 1,2,3,4
		// Level 3: can edit articles created by level 1,2,3
		// Level 2: cannot edit articles (read-only)
		// Level 1: cannot edit articles (read-only)
		AllowEditByLevel: map[int][]int{
			5: {1, 2, 3, 4, 5},
			4: {1, 2, 3, 4},
			3: {1, 2, 3},
			2: {}, // Level 2 cannot edit articles - read-only
			1: {}, // Level 1 cannot edit articles - read-only
		},
		
		// Classification assignment permissions:
		// Level 5: can set any classification level (1-5)
		// Level 4: can only set classification 1,2,3
		// Level 3: can only set classification 1,2
		// Level 2: cannot set classification (0 = read-only)
		// Level 1: cannot set classification (0 = read-only)
		MaxClassificationByLevel: map[int]int{
			5: 5,
			4: 3,
			3: 2,
			2: 0, // Read-only: can read level 1,2 articles but cannot create/edit
			1: 0, // Read-only: can read level 1 articles but cannot create/edit
		},
	}
}

// ArticleAuthorizer handles authorization checks for article operations
type ArticleAuthorizer struct {
	rules *ArticleAuthorizationRules
}

// NewArticleAuthorizer creates a new article authorizer with the given rules
func NewArticleAuthorizer(rules *ArticleAuthorizationRules) *ArticleAuthorizer {
	if rules == nil {
		rules = DefaultArticleAuthorizationRules()
	}
	return &ArticleAuthorizer{rules: rules}
}

// CanCreate checks if a token can create articles
func (a *ArticleAuthorizer) CanCreate(tokenLevel int) bool {
	return tokenLevel >= a.rules.MinLevelForCreate
}

// CanRead checks if a token can read an article based on classification level
func (a *ArticleAuthorizer) CanRead(tokenLevel int, articleClassification int) bool {
	return tokenLevel >= articleClassification
}

// CanUpdate checks if a token can update an article
func (a *ArticleAuthorizer) CanUpdate(tokenLevel int, articleCreatorLevel *int) bool {
	// If we don't know the creator level, only level 5 can edit
	if articleCreatorLevel == nil {
		return tokenLevel >= 5
	}
	
	allowedCreatorLevels, exists := a.rules.AllowEditByLevel[tokenLevel]
	if !exists {
		return false
	}
	
	// Check if the creator level is in the allowed list
	for _, allowedLevel := range allowedCreatorLevels {
		if allowedLevel == *articleCreatorLevel {
			return true
		}
	}
	return false
}

// CanDelete checks if a token can delete articles
func (a *ArticleAuthorizer) CanDelete(tokenLevel int) bool {
	return tokenLevel >= a.rules.MinLevelForDelete
}

// CanSetClassification checks if a token can set a specific classification level
func (a *ArticleAuthorizer) CanSetClassification(tokenLevel int, targetClassification int) bool {
	maxAllowed, exists := a.rules.MaxClassificationByLevel[tokenLevel]
	if !exists {
		return false
	}
	
	// If maxAllowed is 0, this level cannot set any classification
	if maxAllowed == 0 {
		return false
	}
	
	return targetClassification <= maxAllowed && targetClassification >= 1
}

// ValidateCreateRequest validates a create article request against authorization rules
func (a *ArticleAuthorizer) ValidateCreateRequest(token *models.Token, req *models.CreateArticleRequest) error {
	// Check if token can create articles
	if !a.CanCreate(token.ClassificationLevel) {
		return fmt.Errorf("insufficient clearance level: minimum level %d required for creating articles", a.rules.MinLevelForCreate)
	}
	
	// Check if token can set the requested classification level
	if !a.CanSetClassification(token.ClassificationLevel, req.ClassificationLevel) {
		maxAllowed := a.rules.MaxClassificationByLevel[token.ClassificationLevel]
		if maxAllowed == 0 {
			return fmt.Errorf("read-only access: level %d tokens cannot create articles", token.ClassificationLevel)
		}
		return fmt.Errorf("cannot set classification level %d: maximum allowed level for your clearance is %d", req.ClassificationLevel, maxAllowed)
	}
	
	return nil
}

// ValidateUpdateRequest validates an update article request against authorization rules
func (a *ArticleAuthorizer) ValidateUpdateRequest(token *models.Token, article *models.Article, req *models.UpdateArticleRequest) error {
	// Determine the creator level
	var creatorLevel *int
	if article.CreatedBy != nil {
		// In a real implementation, you'd look up the creator's token level
		// For now, we'll assume it's passed or retrieved elsewhere
		// This is a simplified version - you'd need to add a service call here
	}
	
	// Check if token can update this article
	if !a.CanUpdate(token.ClassificationLevel, creatorLevel) {
		maxAllowed := a.rules.MaxClassificationByLevel[token.ClassificationLevel]
		if maxAllowed == 0 {
			return fmt.Errorf("read-only access: level %d tokens cannot edit articles", token.ClassificationLevel)
		}
		return fmt.Errorf("insufficient permissions to edit this article")
	}
	
	// Check classification level changes
	if req.ClassificationLevel != nil {
		if !a.CanSetClassification(token.ClassificationLevel, *req.ClassificationLevel) {
			maxAllowed := a.rules.MaxClassificationByLevel[token.ClassificationLevel]
			if maxAllowed == 0 {
				return fmt.Errorf("read-only access: level %d tokens cannot modify classification levels", token.ClassificationLevel)
			}
			return fmt.Errorf("cannot set classification level %d: maximum allowed level for your clearance is %d", *req.ClassificationLevel, maxAllowed)
		}
	}
	
	return nil
}

// ValidateReadRequest validates if a token can read an article
func (a *ArticleAuthorizer) ValidateReadRequest(token *models.Token, article *models.Article) error {
	if !a.CanRead(token.ClassificationLevel, article.ClassificationLevel) {
		return fmt.Errorf("insufficient clearance level to access this article")
	}
	return nil
}

// ValidateDeleteRequest validates if a token can delete an article
func (a *ArticleAuthorizer) ValidateDeleteRequest(token *models.Token) error {
	if !a.CanDelete(token.ClassificationLevel) {
		return fmt.Errorf("insufficient clearance level: minimum level %d required for deleting articles", a.rules.MinLevelForDelete)
	}
	return nil
}

// GetRules returns a copy of the current authorization rules (for configuration/debugging)
func (a *ArticleAuthorizer) GetRules() *ArticleAuthorizationRules {
	// Return a copy to prevent external modification
	rulesCopy := *a.rules
	
	// Deep copy the map
	rulesCopy.AllowEditByLevel = make(map[int][]int)
	for k, v := range a.rules.AllowEditByLevel {
		rulesCopy.AllowEditByLevel[k] = make([]int, len(v))
		copy(rulesCopy.AllowEditByLevel[k], v)
	}
	
	rulesCopy.MaxClassificationByLevel = make(map[int]int)
	for k, v := range a.rules.MaxClassificationByLevel {
		rulesCopy.MaxClassificationByLevel[k] = v
	}
	
	return &rulesCopy
}

// UpdateRules allows updating the authorization rules (for runtime configuration)
func (a *ArticleAuthorizer) UpdateRules(newRules *ArticleAuthorizationRules) {
	if newRules != nil {
		a.rules = newRules
	}
}