package services

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"fceek/dev-pedia/backend/internal/models"
	"github.com/google/uuid"
)

type ArticleService struct {
	db *sql.DB
}

func NewArticleService(db *sql.DB) *ArticleService {
	return &ArticleService{db: db}
}

// Create creates a new article with optional content secrets
func (s *ArticleService) Create(req *models.CreateArticleRequest, userToken *models.Token) (*models.Article, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Generate UUID for new article
	articleID := uuid.New()

	// Set default status if not provided
	status := req.Status
	if status == "" {
		status = models.ArticleStatusDraft
	}

	// Insert article
	article := &models.Article{
		ID:                  articleID,
		SourceType:          req.SourceType,
		Title:               req.Title,
		Slug:                req.Slug,
		FullPath:            req.FullPath,
		ParentPath:          req.ParentPath,
		Content:             req.Content,
		ClassificationLevel: req.ClassificationLevel,
		Status:              status,
		Metadata:            req.Metadata,
		CreatedBy:           &userToken.ID,
		CreatedAt:           time.Now(),
		UpdatedBy:           &userToken.ID,
		UpdatedAt:           time.Now(),
	}

	query := `
		INSERT INTO articles (id, source_type, title, slug, full_path, parent_path, content, 
		                     classification_level, status, metadata, created_by, created_at, 
		                     updated_by, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	_, err = tx.Exec(query, article.ID, article.SourceType, article.Title, article.Slug,
		article.FullPath, article.ParentPath, article.Content, article.ClassificationLevel,
		article.Status, article.Metadata, article.CreatedBy, article.CreatedAt,
		article.UpdatedBy, article.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create article: %w", err)
	}

	// Create initial version
	_, err = tx.Exec(`
		INSERT INTO article_versions (article_id, article_source_type, version_number, title, 
		                             content, metadata, change_summary, created_by, created_at)
		VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)
	`, articleID, req.SourceType, req.Title, req.Content, req.Metadata, 
		"Initial version", &userToken.ID, time.Now())
	if err != nil {
		return nil, fmt.Errorf("failed to create article version: %w", err)
	}

	// Add tags if provided
	if len(req.TagIDs) > 0 {
		err = s.addTagsToArticle(tx, articleID, req.SourceType, req.TagIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to add tags: %w", err)
		}
	}

	// Add content secrets if provided
	if len(req.Secrets) > 0 {
		err = s.addSecretsToArticle(tx, articleID, req.SourceType, req.Secrets, userToken)
		if err != nil {
			return nil, fmt.Errorf("failed to add secrets: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return article, nil
}

// GetByID retrieves an article by ID
func (s *ArticleService) GetByID(sourceType models.ArticleSourceType, id uuid.UUID) (*models.ArticleWithTags, error) {
	article := &models.Article{}
	query := `
		SELECT id, source_type, title, slug, full_path, parent_path, content, 
		       classification_level, status, metadata, created_by, created_at, 
		       updated_by, updated_at
		FROM articles 
		WHERE source_type = $1 AND id = $2
	`

	err := s.db.QueryRow(query, sourceType, id).Scan(
		&article.ID, &article.SourceType, &article.Title, &article.Slug,
		&article.FullPath, &article.ParentPath, &article.Content,
		&article.ClassificationLevel, &article.Status, &article.Metadata,
		&article.CreatedBy, &article.CreatedAt, &article.UpdatedBy, &article.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("article not found")
		}
		return nil, fmt.Errorf("failed to get article: %w", err)
	}

	// Get tags
	tags, err := s.getArticleTags(article.SourceType, article.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get article tags: %w", err)
	}

	return &models.ArticleWithTags{
		Article: *article,
		Tags:    tags,
	}, nil
}

// GetByPath retrieves an article by its full path
func (s *ArticleService) GetByPath(sourceType models.ArticleSourceType, fullPath string) (*models.ArticleWithTags, error) {
	article := &models.Article{}
	query := `
		SELECT id, source_type, title, slug, full_path, parent_path, content, 
		       classification_level, status, metadata, created_by, created_at, 
		       updated_by, updated_at
		FROM articles 
		WHERE source_type = $1 AND full_path = $2
	`

	err := s.db.QueryRow(query, sourceType, fullPath).Scan(
		&article.ID, &article.SourceType, &article.Title, &article.Slug,
		&article.FullPath, &article.ParentPath, &article.Content,
		&article.ClassificationLevel, &article.Status, &article.Metadata,
		&article.CreatedBy, &article.CreatedAt, &article.UpdatedBy, &article.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("article not found")
		}
		return nil, fmt.Errorf("failed to get article: %w", err)
	}

	// Get tags
	tags, err := s.getArticleTags(article.SourceType, article.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get article tags: %w", err)
	}

	return &models.ArticleWithTags{
		Article: *article,
		Tags:    tags,
	}, nil
}

// List retrieves articles with filtering and pagination
func (s *ArticleService) List(sourceType *models.ArticleSourceType, parentPath *string, 
	status *models.ArticleStatus, classificationLevel *int, page, pageSize int) (*models.ArticleListResponse, error) {
	
	// Build query with filters
	conditions := []string{}
	args := []interface{}{}
	argIndex := 1

	if sourceType != nil {
		conditions = append(conditions, fmt.Sprintf("source_type = $%d", argIndex))
		args = append(args, *sourceType)
		argIndex++
	}

	if parentPath != nil {
		conditions = append(conditions, fmt.Sprintf("parent_path = $%d", argIndex))
		args = append(args, *parentPath)
		argIndex++
	}

	if status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *status)
		argIndex++
	}

	if classificationLevel != nil {
		conditions = append(conditions, fmt.Sprintf("classification_level <= $%d", argIndex))
		args = append(args, *classificationLevel)
		argIndex++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total results
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM articles %s", whereClause)
	var total int
	err := s.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count articles: %w", err)
	}

	// Get paginated results
	offset := (page - 1) * pageSize
	query := fmt.Sprintf(`
		SELECT id, source_type, title, slug, full_path, parent_path, content, 
		       classification_level, status, metadata, created_by, created_at, 
		       updated_by, updated_at
		FROM articles 
		%s 
		ORDER BY created_at DESC 
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query articles: %w", err)
	}
	defer rows.Close()

	articles := []models.ArticleWithTags{}
	for rows.Next() {
		article := models.Article{}
		err := rows.Scan(
			&article.ID, &article.SourceType, &article.Title, &article.Slug,
			&article.FullPath, &article.ParentPath, &article.Content,
			&article.ClassificationLevel, &article.Status, &article.Metadata,
			&article.CreatedBy, &article.CreatedAt, &article.UpdatedBy, &article.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan article: %w", err)
		}

		// Get tags for this article
		tags, err := s.getArticleTags(article.SourceType, article.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get article tags: %w", err)
		}

		articles = append(articles, models.ArticleWithTags{
			Article: article,
			Tags:    tags,
		})
	}

	return &models.ArticleListResponse{
		Articles: articles,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// Update updates an existing article with optional content secrets
func (s *ArticleService) Update(sourceType models.ArticleSourceType, id uuid.UUID, 
	req *models.UpdateArticleRequest, userToken *models.Token) (*models.Article, error) {
	
	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Get current article
	current := &models.Article{}
	err = tx.QueryRow(`
		SELECT id, source_type, title, slug, full_path, parent_path, content, 
		       classification_level, status, metadata, created_by, created_at, 
		       updated_by, updated_at
		FROM articles 
		WHERE source_type = $1 AND id = $2
	`, sourceType, id).Scan(
		&current.ID, &current.SourceType, &current.Title, &current.Slug,
		&current.FullPath, &current.ParentPath, &current.Content,
		&current.ClassificationLevel, &current.Status, &current.Metadata,
		&current.CreatedBy, &current.CreatedAt, &current.UpdatedBy, &current.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("article not found")
		}
		return nil, fmt.Errorf("failed to get current article: %w", err)
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Title != nil {
		updates = append(updates, fmt.Sprintf("title = $%d", argIndex))
		args = append(args, *req.Title)
		current.Title = *req.Title
		argIndex++
	}

	if req.Slug != nil {
		updates = append(updates, fmt.Sprintf("slug = $%d", argIndex))
		args = append(args, req.Slug)
		current.Slug = req.Slug
		argIndex++
	}

	if req.FullPath != nil {
		updates = append(updates, fmt.Sprintf("full_path = $%d", argIndex))
		args = append(args, *req.FullPath)
		current.FullPath = *req.FullPath
		argIndex++
	}

	if req.ParentPath != nil {
		updates = append(updates, fmt.Sprintf("parent_path = $%d", argIndex))
		args = append(args, req.ParentPath)
		current.ParentPath = req.ParentPath
		argIndex++
	}

	if req.Content != nil {
		updates = append(updates, fmt.Sprintf("content = $%d", argIndex))
		args = append(args, *req.Content)
		current.Content = *req.Content
		argIndex++
	}

	if req.ClassificationLevel != nil {
		updates = append(updates, fmt.Sprintf("classification_level = $%d", argIndex))
		args = append(args, *req.ClassificationLevel)
		current.ClassificationLevel = *req.ClassificationLevel
		argIndex++
	}

	if req.Status != nil {
		updates = append(updates, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *req.Status)
		current.Status = *req.Status
		argIndex++
	}

	if req.Metadata != nil {
		updates = append(updates, fmt.Sprintf("metadata = $%d", argIndex))
		args = append(args, req.Metadata)
		current.Metadata = req.Metadata
		argIndex++
	}

	// Always update timestamp and updater
	updates = append(updates, fmt.Sprintf("updated_by = $%d", argIndex))
	args = append(args, &userToken.ID)
	current.UpdatedBy = &userToken.ID
	argIndex++

	updates = append(updates, fmt.Sprintf("updated_at = $%d", argIndex))
	now := time.Now()
	args = append(args, now)
	current.UpdatedAt = now
	argIndex++

	// Add WHERE clause
	args = append(args, sourceType, id)

	if len(updates) > 2 { // More than just timestamp updates
		query := fmt.Sprintf("UPDATE articles SET %s WHERE source_type = $%d AND id = $%d", 
			strings.Join(updates, ", "), argIndex-1, argIndex)

		_, err = tx.Exec(query, args...)
		if err != nil {
			return nil, fmt.Errorf("failed to update article: %w", err)
		}

		// Create new version if content changed
		if req.Content != nil {
			// Get next version number
			var nextVersion int
			err = tx.QueryRow(`
				SELECT COALESCE(MAX(version_number), 0) + 1 
				FROM article_versions 
				WHERE article_source_type = $1 AND article_id = $2
			`, sourceType, id).Scan(&nextVersion)
			if err != nil {
				return nil, fmt.Errorf("failed to get next version number: %w", err)
			}

			changeSummary := req.ChangeSummary
			if changeSummary == nil {
				defaultSummary := "Updated content"
				changeSummary = &defaultSummary
			}

			_, err = tx.Exec(`
				INSERT INTO article_versions (article_id, article_source_type, version_number, 
				                             title, content, metadata, change_summary, created_by, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			`, id, sourceType, nextVersion, current.Title, current.Content, current.Metadata,
				*changeSummary, &userToken.ID, now)
			if err != nil {
				return nil, fmt.Errorf("failed to create article version: %w", err)
			}
		}
	}

	// Update tags if provided
	if req.TagIDs != nil {
		// Remove existing tags
		_, err = tx.Exec(`
			DELETE FROM article_tag_relations 
			WHERE article_source_type = $1 AND article_id = $2
		`, sourceType, id)
		if err != nil {
			return nil, fmt.Errorf("failed to remove existing tags: %w", err)
		}

		// Add new tags
		if len(req.TagIDs) > 0 {
			err = s.addTagsToArticle(tx, id, sourceType, req.TagIDs)
			if err != nil {
				return nil, fmt.Errorf("failed to add tags: %w", err)
			}
		}
	}

	// Update content secrets if provided
	if req.Secrets != nil {
		// Remove existing secrets
		_, err = tx.Exec(`
			DELETE FROM article_content_secrets 
			WHERE article_source_type = $1 AND article_id = $2
		`, sourceType, id)
		if err != nil {
			return nil, fmt.Errorf("failed to remove existing secrets: %w", err)
		}

		// Add new secrets
		if len(req.Secrets) > 0 {
			err = s.addSecretsToArticle(tx, id, sourceType, req.Secrets, userToken)
			if err != nil {
				return nil, fmt.Errorf("failed to add secrets: %w", err)
			}
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return current, nil
}

// Delete deletes an article
func (s *ArticleService) Delete(sourceType models.ArticleSourceType, id uuid.UUID) error {
	result, err := s.db.Exec(`
		DELETE FROM articles 
		WHERE source_type = $1 AND id = $2
	`, sourceType, id)
	if err != nil {
		return fmt.Errorf("failed to delete article: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("article not found")
	}

	return nil
}

// Helper functions

func (s *ArticleService) addTagsToArticle(tx *sql.Tx, articleID uuid.UUID, 
	sourceType models.ArticleSourceType, tagIDs []uuid.UUID) error {
	
	for _, tagID := range tagIDs {
		_, err := tx.Exec(`
			INSERT INTO article_tag_relations (article_id, article_source_type, tag_id)
			VALUES ($1, $2, $3)
			ON CONFLICT DO NOTHING
		`, articleID, sourceType, tagID)
		if err != nil {
			return fmt.Errorf("failed to add tag relation: %w", err)
		}
	}
	return nil
}

func (s *ArticleService) getArticleTags(sourceType models.ArticleSourceType, articleID uuid.UUID) ([]models.ArticleTag, error) {
	rows, err := s.db.Query(`
		SELECT t.id, t.name, t.color, t.created_at
		FROM article_tags t
		INNER JOIN article_tag_relations r ON t.id = r.tag_id
		WHERE r.article_source_type = $1 AND r.article_id = $2
		ORDER BY t.name
	`, sourceType, articleID)
	if err != nil {
		return nil, fmt.Errorf("failed to query article tags: %w", err)
	}
	defer rows.Close()

	tags := []models.ArticleTag{}
	for rows.Next() {
		tag := models.ArticleTag{}
		err := rows.Scan(&tag.ID, &tag.Name, &tag.Color, &tag.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan tag: %w", err)
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

// addSecretsToArticle adds content secrets to an article with authorization checks
func (s *ArticleService) addSecretsToArticle(tx *sql.Tx, articleID uuid.UUID, sourceType models.ArticleSourceType, secrets []models.CreateContentSecretRequest, userToken *models.Token) error {
	for _, secretReq := range secrets {
		// Authorization check: user can only create secrets at or below their classification level
		if userToken.ClassificationLevel < secretReq.ClassificationLevel {
			return fmt.Errorf("insufficient clearance to create secret with classification level %d (user level: %d)", 
				secretReq.ClassificationLevel, userToken.ClassificationLevel)
		}

		// Create the secret
		_, err := tx.Exec(`
			INSERT INTO article_content_secrets (
				id, article_id, article_source_type, secret_key, classification_level,
				content, description, created_by, created_at, updated_by, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`, uuid.New(), articleID, sourceType, secretReq.SecretKey, secretReq.ClassificationLevel,
			secretReq.Content, secretReq.Description, &userToken.ID, time.Now(),
			&userToken.ID, time.Now())
		if err != nil {
			return fmt.Errorf("failed to add secret '%s': %w", secretReq.SecretKey, err)
		}
	}
	return nil
}

// ProcessContentForUser processes article content with classification-based secret filtering
func (s *ArticleService) ProcessContentForUser(article *models.Article, userToken *models.Token, ipAddress, userAgent string) (*models.ProcessedArticle, error) {
	// Get all secrets for this article
	secrets, err := s.getArticleSecrets(article.SourceType, article.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get article secrets: %w", err)
	}
	
	// Create secret mappings with access control
	secretMappings := []models.SecretMapping{}
	for _, secret := range secrets {
		hasAccess := userToken.ClassificationLevel >= secret.ClassificationLevel
		
		mapping := models.SecretMapping{
			SecretKey:           secret.SecretKey,
			ClassificationLevel: secret.ClassificationLevel,
			HasAccess:           hasAccess,
			DeniedMessage:       "[Access Denied]",
			Description:         secret.Description,
		}
		
		// Only include actual content if user has access
		if hasAccess {
			mapping.RevealedContent = &secret.Content
		}
		
		secretMappings = append(secretMappings, mapping)
		
		// Log access attempt
		if userToken != nil {
			err := s.logSecretAccess(article, secret.SecretKey, userToken, hasAccess, secret.ClassificationLevel, ipAddress, userAgent)
			if err != nil {
				// Log error but don't fail the request
				fmt.Printf("Failed to log secret access: %v\n", err)
			}
		}
	}
	
	return &models.ProcessedArticle{
		Article:             *article,
		ProcessedContent:    article.Content, // Original content with placeholders intact
		SecretMappings:      secretMappings,
		UserClassification:  userToken.ClassificationLevel,
	}, nil
}

// getArticleSecrets retrieves all secrets for an article
func (s *ArticleService) getArticleSecrets(sourceType models.ArticleSourceType, articleID uuid.UUID) ([]models.ContentSecret, error) {
	query := `
		SELECT id, article_id, article_source_type, secret_key, classification_level,
		       content, description, created_by, created_at, updated_by, updated_at
		FROM article_content_secrets
		WHERE article_source_type = $1 AND article_id = $2
		ORDER BY secret_key
	`
	
	rows, err := s.db.Query(query, sourceType, articleID)
	if err != nil {
		return nil, fmt.Errorf("failed to query article secrets: %w", err)
	}
	defer rows.Close()
	
	secrets := []models.ContentSecret{}
	for rows.Next() {
		secret := models.ContentSecret{}
		err := rows.Scan(
			&secret.ID, &secret.ArticleID, &secret.ArticleSourceType,
			&secret.SecretKey, &secret.ClassificationLevel, &secret.Content,
			&secret.Description, &secret.CreatedBy, &secret.CreatedAt,
			&secret.UpdatedBy, &secret.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan secret: %w", err)
		}
		secrets = append(secrets, secret)
	}
	
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating secrets: %w", err)
	}
	
	return secrets, nil
}

// logSecretAccess logs an access attempt to a secret for audit purposes
func (s *ArticleService) logSecretAccess(article *models.Article, secretKey string, userToken *models.Token, accessGranted bool, requiredLevel int, ipAddress, userAgent string) error {
	query := `
		INSERT INTO article_secret_access_log (
			article_id, article_source_type, secret_key, token_id, access_granted,
			user_classification_level, required_classification_level, ip_address, user_agent, accessed_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
	`
	
	_, err := s.db.Exec(query, article.ID, article.SourceType, secretKey, userToken.ID,
		accessGranted, userToken.ClassificationLevel, requiredLevel, ipAddress, userAgent)
	if err != nil {
		return fmt.Errorf("failed to log secret access: %w", err)
	}
	
	return nil
}