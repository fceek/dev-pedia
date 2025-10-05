package services

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type LinkStrengthService struct {
	db *sql.DB
}

func NewLinkStrengthService(db *sql.DB) *LinkStrengthService {
	return &LinkStrengthService{db: db}
}

// LinkStrength represents calculated strength for a link
type LinkStrength struct {
	LinkID              uuid.UUID
	SourceArticleID     uuid.UUID
	TargetArticleID     uuid.UUID
	BaseStrength        float64
	SharedTagsScore     float64
	RecencyScore        float64
	BidirectionalScore  float64
	LinkCountScore      float64
	TotalStrength       float64
	NormalizedStrength  float64
	CalculatedAt        time.Time
}

// CalculateAllLinkStrengths recalculates strength for all links in the graph
func (s *LinkStrengthService) CalculateAllLinkStrengths() (int, error) {
	// Get all link IDs
	rows, err := s.db.Query("SELECT id FROM article_links")
	if err != nil {
		return 0, fmt.Errorf("failed to fetch link IDs: %w", err)
	}
	defer rows.Close()

	linkIDs := []uuid.UUID{}
	for rows.Next() {
		var linkID uuid.UUID
		if err := rows.Scan(&linkID); err != nil {
			return 0, fmt.Errorf("failed to scan link ID: %w", err)
		}
		linkIDs = append(linkIDs, linkID)
	}

	// Calculate strength for each link
	for _, linkID := range linkIDs {
		if err := s.CalculateLinkStrength(linkID); err != nil {
			// Log error but continue
			fmt.Printf("Warning: failed to calculate strength for link %s: %v\n", linkID, err)
		}
	}

	// Normalize all strengths
	if err := s.NormalizeStrengths(); err != nil {
		return len(linkIDs), fmt.Errorf("failed to normalize strengths: %w", err)
	}

	// Refresh materialized view
	if err := s.RefreshWeightedGraph(); err != nil {
		// Log but don't fail
		fmt.Printf("Warning: failed to refresh weighted graph view: %v\n", err)
	}

	return len(linkIDs), nil
}

// CalculateLinkStrength calculates strength for a single link using DB function
func (s *LinkStrengthService) CalculateLinkStrength(linkID uuid.UUID) error {
	_, err := s.db.Exec("SELECT calculate_link_strength($1)", linkID)
	if err != nil {
		return fmt.Errorf("failed to calculate link strength: %w", err)
	}
	return nil
}

// NormalizeStrengths normalizes all link strengths to 0-1 range
func (s *LinkStrengthService) NormalizeStrengths() error {
	_, err := s.db.Exec("SELECT normalize_link_strengths()")
	if err != nil {
		return fmt.Errorf("failed to normalize link strengths: %w", err)
	}
	return nil
}

// RefreshWeightedGraph refreshes the materialized view of weighted graph
func (s *LinkStrengthService) RefreshWeightedGraph() error {
	_, err := s.db.Exec("SELECT refresh_weighted_graph()")
	if err != nil {
		return fmt.Errorf("failed to refresh weighted graph: %w", err)
	}
	return nil
}

// GetLinkStrength retrieves calculated strength for a specific link
func (s *LinkStrengthService) GetLinkStrength(linkID uuid.UUID) (*LinkStrength, error) {
	query := `
		SELECT
			link_id,
			source_article_id,
			target_article_id,
			base_strength,
			shared_tags_score,
			recency_score,
			bidirectional_score,
			link_count_score,
			total_strength,
			normalized_strength,
			calculated_at
		FROM article_link_strength
		WHERE link_id = $1
	`

	var strength LinkStrength
	err := s.db.QueryRow(query, linkID).Scan(
		&strength.LinkID,
		&strength.SourceArticleID,
		&strength.TargetArticleID,
		&strength.BaseStrength,
		&strength.SharedTagsScore,
		&strength.RecencyScore,
		&strength.BidirectionalScore,
		&strength.LinkCountScore,
		&strength.TotalStrength,
		&strength.NormalizedStrength,
		&strength.CalculatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil // No strength calculated yet
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get link strength: %w", err)
	}

	return &strength, nil
}

// GetWeightedEdges retrieves all edges with their strengths for graph visualization
func (s *LinkStrengthService) GetWeightedEdges(userClassificationLevel int) ([]WeightedEdge, error) {
	query := `
		SELECT
			link_id,
			source_article_id,
			target_article_id,
			link_text,
			link_type,
			total_strength,
			normalized_strength
		FROM weighted_graph_view
		WHERE source_classification <= $1
		  AND target_classification <= $1
		ORDER BY total_strength DESC
	`

	rows, err := s.db.Query(query, userClassificationLevel)
	if err != nil {
		return nil, fmt.Errorf("failed to query weighted edges: %w", err)
	}
	defer rows.Close()

	edges := []WeightedEdge{}
	for rows.Next() {
		var edge WeightedEdge
		var linkText sql.NullString

		err := rows.Scan(
			&edge.LinkID,
			&edge.SourceID,
			&edge.TargetID,
			&linkText,
			&edge.LinkType,
			&edge.TotalStrength,
			&edge.NormalizedStrength,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan weighted edge: %w", err)
		}

		if linkText.Valid {
			edge.LinkText = &linkText.String
		}

		edges = append(edges, edge)
	}

	return edges, nil
}

// WeightedEdge represents a link with calculated strength
type WeightedEdge struct {
	LinkID             uuid.UUID `json:"id"`
	SourceID           uuid.UUID `json:"source"`
	TargetID           uuid.UUID `json:"target"`
	LinkText           *string   `json:"link_text,omitempty"`
	LinkType           string    `json:"link_type"`
	TotalStrength      float64   `json:"total_strength"`
	NormalizedStrength float64   `json:"normalized_strength"`
}
