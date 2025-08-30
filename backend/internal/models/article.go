package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

// ArticleSourceType represents the source type of an article
type ArticleSourceType string

const (
	ArticleSourceDoc ArticleSourceType = "doc"
	ArticleSourceGit ArticleSourceType = "git"
)

// ArticleStatus represents the publication status of an article
type ArticleStatus string

const (
	ArticleStatusDraft     ArticleStatus = "draft"
	ArticleStatusPublished ArticleStatus = "published"
	ArticleStatusArchived  ArticleStatus = "archived"
)

// ArticleMetadata represents the JSONB metadata field
type ArticleMetadata map[string]interface{}

// Value implements the driver.Valuer interface for database storage
func (m ArticleMetadata) Value() (driver.Value, error) {
	if m == nil {
		return nil, nil
	}
	return json.Marshal(m)
}

// Scan implements the sql.Scanner interface for database retrieval
func (m *ArticleMetadata) Scan(value interface{}) error {
	if value == nil {
		*m = make(ArticleMetadata)
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, m)
	case string:
		return json.Unmarshal([]byte(v), m)
	default:
		return errors.New("cannot scan into ArticleMetadata")
	}
}

// Article represents the main article structure
type Article struct {
	ID                  uuid.UUID           `json:"id" db:"id"`
	SourceType          ArticleSourceType   `json:"source_type" db:"source_type"`
	Title               string              `json:"title" db:"title"`
	Slug                *string             `json:"slug" db:"slug"`
	FullPath            string              `json:"full_path" db:"full_path"`
	ParentPath          *string             `json:"parent_path" db:"parent_path"`
	Content             string              `json:"content" db:"content"`
	ClassificationLevel int                 `json:"classification_level" db:"classification_level"`
	Status              ArticleStatus       `json:"status" db:"status"`
	Metadata            ArticleMetadata     `json:"metadata" db:"metadata"`
	CreatedBy           *uuid.UUID          `json:"created_by" db:"created_by"`
	CreatedAt           time.Time           `json:"created_at" db:"created_at"`
	UpdatedBy           *uuid.UUID          `json:"updated_by" db:"updated_by"`
	UpdatedAt           time.Time           `json:"updated_at" db:"updated_at"`
}

// ArticleVersion represents a version of an article for history tracking
type ArticleVersion struct {
	ID                uuid.UUID           `json:"id" db:"id"`
	ArticleID         uuid.UUID           `json:"article_id" db:"article_id"`
	ArticleSourceType ArticleSourceType   `json:"article_source_type" db:"article_source_type"`
	VersionNumber     int                 `json:"version_number" db:"version_number"`
	Title             string              `json:"title" db:"title"`
	Content           string              `json:"content" db:"content"`
	Metadata          ArticleMetadata     `json:"metadata" db:"metadata"`
	ChangeSummary     *string             `json:"change_summary" db:"change_summary"`
	CreatedBy         *uuid.UUID          `json:"created_by" db:"created_by"`
	CreatedAt         time.Time           `json:"created_at" db:"created_at"`
}

// ArticleMedia represents media attachments for articles
type ArticleMedia struct {
	ID                uuid.UUID           `json:"id" db:"id"`
	ArticleID         uuid.UUID           `json:"article_id" db:"article_id"`
	ArticleSourceType ArticleSourceType   `json:"article_source_type" db:"article_source_type"`
	Filename          string              `json:"filename" db:"filename"`
	OriginalName      string              `json:"original_name" db:"original_name"`
	MimeType          string              `json:"mime_type" db:"mime_type"`
	FileSize          int                 `json:"file_size" db:"file_size"`
	FilePath          string              `json:"file_path" db:"file_path"`
	AltText           *string             `json:"alt_text" db:"alt_text"`
	CreatedBy         *uuid.UUID          `json:"created_by" db:"created_by"`
	CreatedAt         time.Time           `json:"created_at" db:"created_at"`
}

// ArticleTag represents a tag that can be applied to articles
type ArticleTag struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Color     string    `json:"color" db:"color"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// ArticleTagRelation represents the many-to-many relationship between articles and tags
type ArticleTagRelation struct {
	ArticleID         uuid.UUID         `json:"article_id" db:"article_id"`
	ArticleSourceType ArticleSourceType `json:"article_source_type" db:"article_source_type"`
	TagID             uuid.UUID         `json:"tag_id" db:"tag_id"`
}

// CreateArticleRequest represents a request to create a new article
type CreateArticleRequest struct {
	SourceType          ArticleSourceType `json:"source_type" validate:"required,oneof=doc git"`
	Title               string            `json:"title" validate:"required,max=200"`
	Slug                *string           `json:"slug" validate:"omitempty,max=100"`
	FullPath            string            `json:"full_path" validate:"required"`
	ParentPath          *string           `json:"parent_path"`
	Content             string            `json:"content" validate:"required"`
	ClassificationLevel int               `json:"classification_level" validate:"required,min=1,max=5"`
	Status              ArticleStatus     `json:"status" validate:"omitempty,oneof=draft published archived"`
	Metadata            ArticleMetadata   `json:"metadata"`
	TagIDs              []uuid.UUID       `json:"tag_ids"`
}

// UpdateArticleRequest represents a request to update an existing article
type UpdateArticleRequest struct {
	Title               *string           `json:"title" validate:"omitempty,max=200"`
	Slug                *string           `json:"slug" validate:"omitempty,max=100"`
	FullPath            *string           `json:"full_path"`
	ParentPath          *string           `json:"parent_path"`
	Content             *string           `json:"content"`
	ClassificationLevel *int              `json:"classification_level" validate:"omitempty,min=1,max=5"`
	Status              *ArticleStatus    `json:"status" validate:"omitempty,oneof=draft published archived"`
	Metadata            ArticleMetadata   `json:"metadata"`
	ChangeSummary       *string           `json:"change_summary" validate:"omitempty,max=500"`
	TagIDs              []uuid.UUID       `json:"tag_ids"`
}

// ArticleWithTags combines article with its associated tags
type ArticleWithTags struct {
	Article `json:",inline"`
	Tags    []ArticleTag `json:"tags"`
}

// ArticleListResponse represents a paginated list of articles
type ArticleListResponse struct {
	Articles []ArticleWithTags `json:"articles"`
	Total    int               `json:"total"`
	Page     int               `json:"page"`
	PageSize int               `json:"page_size"`
}


// IsActive checks if the article is in an active state
func (a *Article) IsActive() bool {
	return a.Status == ArticleStatusPublished || a.Status == ArticleStatusDraft
}