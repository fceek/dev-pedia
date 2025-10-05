package services

import (
	"database/sql"
	"fmt"
	"regexp"
	"strings"
	"time"

	"fceek/dev-pedia/backend/internal/models"
	"github.com/google/uuid"
)

type LinkService struct {
	db *sql.DB
}

func NewLinkService(db *sql.DB) *LinkService {
	return &LinkService{db: db}
}

// Regular expression to match wiki-style links: [[target]] or [[target|display]]
var wikiLinkRegex = regexp.MustCompile(`\[\[([^\]|]+)(?:\|([^\]]+))?\]\]`)

// ExtractLinksFromContent parses markdown content and extracts all wiki-style links
func (s *LinkService) ExtractLinksFromContent(content string) []models.ParsedLink {
	matches := wikiLinkRegex.FindAllStringSubmatchIndex(content, -1)
	links := make([]models.ParsedLink, 0, len(matches))

	for _, match := range matches {
		// match[0], match[1] = full match start/end positions
		// match[2], match[3] = first capture group (target) start/end
		// match[4], match[5] = second capture group (display) start/end (if present)

		fullText := content[match[0]:match[1]]
		target := content[match[2]:match[3]]

		display := target // Default display text is the target
		if match[4] != -1 && match[5] != -1 {
			display = content[match[4]:match[5]]
		}

		links = append(links, models.ParsedLink{
			OriginalText:  fullText,
			TargetPath:    strings.TrimSpace(target),
			DisplayText:   strings.TrimSpace(display),
			StartPosition: match[0],
			EndPosition:   match[1],
		})
	}

	return links
}

// ResolveLink attempts to find the target article by path or title
func (s *LinkService) ResolveLink(targetPath string, sourceType models.ArticleSourceType) (*models.Article, error) {
	// Try exact path match first
	article := &models.Article{}
	query := `
		SELECT id, source_type, title, full_path, classification_level, status
		FROM articles
		WHERE source_type = $1 AND (full_path = $2 OR title = $2)
		LIMIT 1
	`

	err := s.db.QueryRow(query, sourceType, targetPath).Scan(
		&article.ID, &article.SourceType, &article.Title,
		&article.FullPath, &article.ClassificationLevel, &article.Status,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("article not found: %s", targetPath)
		}
		return nil, fmt.Errorf("failed to resolve link: %w", err)
	}

	return article, nil
}

// SaveLinks persists extracted links to the database
func (s *LinkService) SaveLinks(tx *sql.Tx, sourceArticleID uuid.UUID, sourceArticleType models.ArticleSourceType, links []models.ParsedLink, content string) error {
	// First, delete existing links from this article
	_, err := tx.Exec(`
		DELETE FROM article_links
		WHERE source_article_type = $1 AND source_article_id = $2
	`, sourceArticleType, sourceArticleID)
	if err != nil {
		return fmt.Errorf("failed to delete existing links: %w", err)
	}

	// Insert new links
	for _, link := range links {
		// Resolve the target article
		targetArticle, err := s.ResolveLink(link.TargetPath, sourceArticleType)
		if err != nil {
			// Link target doesn't exist yet - skip but log
			fmt.Printf("Skipping unresolved link: %s (error: %v)\n", link.TargetPath, err)
			continue
		}

		// Extract context snippet (±50 characters around the link)
		contextSnippet := extractContextSnippet(content, link.StartPosition, link.EndPosition, 50)

		// Insert the link
		_, err = tx.Exec(`
			INSERT INTO article_links (
				id, source_article_id, source_article_type,
				target_article_id, target_article_type,
				link_text, link_type, context_snippet, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (source_article_type, source_article_id, target_article_type, target_article_id, link_text)
			DO NOTHING
		`, uuid.New(), sourceArticleID, sourceArticleType,
			targetArticle.ID, targetArticle.SourceType,
			link.OriginalText, "wiki", contextSnippet, time.Now())

		if err != nil {
			return fmt.Errorf("failed to insert link: %w", err)
		}
	}

	return nil
}

// GetBacklinks retrieves all articles that link to the specified article
func (s *LinkService) GetBacklinks(targetArticleID uuid.UUID, targetArticleType models.ArticleSourceType, userClassificationLevel int) ([]models.BacklinkSummary, error) {
	query := `
		SELECT
			source_article_id, source_article_type,
			source_title, source_path, source_classification,
			link_text, context_snippet, created_at
		FROM article_backlinks_view
		WHERE target_article_type = $1
		  AND target_article_id = $2
		  AND source_classification <= $3
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query, targetArticleType, targetArticleID, userClassificationLevel)
	if err != nil {
		return nil, fmt.Errorf("failed to query backlinks: %w", err)
	}
	defer rows.Close()

	backlinks := []models.BacklinkSummary{}
	for rows.Next() {
		var backlink models.BacklinkSummary
		err := rows.Scan(
			&backlink.SourceArticleID, &backlink.SourceArticleType,
			&backlink.SourceTitle, &backlink.SourcePath, &backlink.SourceClassification,
			&backlink.LinkText, &backlink.ContextSnippet, &backlink.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan backlink: %w", err)
		}
		backlinks = append(backlinks, backlink)
	}

	return backlinks, nil
}

// GetFullGraph retrieves the complete knowledge graph filtered by classification level
func (s *LinkService) GetFullGraph(userClassificationLevel int) (*models.GraphData, error) {
	return s.GetFilteredGraph(userClassificationLevel, nil)
}

// GetFilteredGraph retrieves the knowledge graph with additional filter options
func (s *LinkService) GetFilteredGraph(userClassificationLevel int, filters *models.GraphFilterOptions) (*models.GraphData, error) {
	// Get all accessible nodes (articles) with filters
	nodes, err := s.getGraphNodesWithFilters(userClassificationLevel, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get graph nodes: %w", err)
	}

	// Get all edges between accessible nodes
	edges, err := s.getGraphEdges(userClassificationLevel)
	if err != nil {
		return nil, fmt.Errorf("failed to get graph edges: %w", err)
	}

	// Filter edges to only include those between filtered nodes
	nodeIDSet := make(map[uuid.UUID]bool)
	for _, node := range nodes {
		nodeIDSet[node.ID] = true
	}

	filteredEdges := []models.GraphEdge{}
	for _, edge := range edges {
		if nodeIDSet[edge.Source] && nodeIDSet[edge.Target] {
			filteredEdges = append(filteredEdges, edge)
		}
	}

	// Calculate statistics
	stats := s.calculateGraphStats(nodes, filteredEdges)

	return &models.GraphData{
		Nodes: nodes,
		Edges: filteredEdges,
		Stats: stats,
	}, nil
}

// getGraphNodesWithFilters retrieves article nodes with additional filter options
func (s *LinkService) getGraphNodesWithFilters(userClassificationLevel int, filters *models.GraphFilterOptions) ([]models.GraphNode, error) {
	// Build dynamic query with filters
	query := `
		SELECT
			a.id, a.source_type, a.title, a.full_path,
			a.classification_level, a.status,
			COALESCE(gs.inbound_links_count, 0) as inbound_count,
			COALESCE(gs.outbound_links_count, 0) as outbound_count,
			COALESCE(gs.total_degree, 0) as total_degree,
			COALESCE(gs.is_orphan, true) as is_orphan,
			COALESCE(gs.is_hub, false) as is_hub,
			COALESCE(gs.is_authority, false) as is_authority
		FROM articles a
		LEFT JOIN article_graph_stats gs
			ON a.source_type = gs.article_source_type AND a.id = gs.article_id
		WHERE a.classification_level <= $1
		  AND a.status IN ('draft', 'published')
	`

	args := []interface{}{userClassificationLevel}
	argIndex := 2

	// Apply additional filters
	if filters != nil {
		if filters.MinClassificationLevel != nil {
			query += fmt.Sprintf(" AND a.classification_level >= $%d", argIndex)
			args = append(args, *filters.MinClassificationLevel)
			argIndex++
		}

		if filters.MaxClassificationLevel != nil {
			query += fmt.Sprintf(" AND a.classification_level <= $%d", argIndex)
			args = append(args, *filters.MaxClassificationLevel)
			argIndex++
		}

		if len(filters.SourceTypes) > 0 {
			query += fmt.Sprintf(" AND a.source_type = ANY($%d)", argIndex)
			sourceTypeStrs := make([]string, len(filters.SourceTypes))
			for i, st := range filters.SourceTypes {
				sourceTypeStrs[i] = string(st)
			}
			args = append(args, sourceTypeStrs)
			argIndex++
		}

		if filters.OnlyHubs {
			query += " AND COALESCE(gs.is_hub, false) = true"
		}

		if filters.OnlyAuthorities {
			query += " AND COALESCE(gs.is_authority, false) = true"
		}

		if filters.OnlyOrphans {
			query += " AND COALESCE(gs.is_orphan, true) = true"
		}

		if filters.ExcludeOrphans {
			query += " AND COALESCE(gs.is_orphan, true) = false"
		}
	}

	query += " ORDER BY a.title"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query graph nodes: %w", err)
	}
	defer rows.Close()

	nodes := []models.GraphNode{}
	for rows.Next() {
		var node models.GraphNode
		err := rows.Scan(
			&node.ID, &node.SourceType, &node.Title, &node.FullPath,
			&node.ClassificationLevel, &node.Status,
			&node.InboundCount, &node.OutboundCount, &node.TotalDegree,
			&node.IsOrphan, &node.IsHub, &node.IsAuthority,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan node: %w", err)
		}
		nodes = append(nodes, node)
	}

	return nodes, nil
}

// getGraphNodes retrieves all article nodes accessible to the user
func (s *LinkService) getGraphNodes(userClassificationLevel int) ([]models.GraphNode, error) {
	query := `
		SELECT
			a.id, a.source_type, a.title, a.full_path,
			a.classification_level, a.status,
			COALESCE(gs.inbound_links_count, 0) as inbound_count,
			COALESCE(gs.outbound_links_count, 0) as outbound_count,
			COALESCE(gs.total_degree, 0) as total_degree,
			COALESCE(gs.is_orphan, true) as is_orphan,
			COALESCE(gs.is_hub, false) as is_hub,
			COALESCE(gs.is_authority, false) as is_authority
		FROM articles a
		LEFT JOIN article_graph_stats gs
			ON a.source_type = gs.article_source_type AND a.id = gs.article_id
		WHERE a.classification_level <= $1
		  AND a.status IN ('draft', 'published')
		ORDER BY a.title
	`

	rows, err := s.db.Query(query, userClassificationLevel)
	if err != nil {
		return nil, fmt.Errorf("failed to query graph nodes: %w", err)
	}
	defer rows.Close()

	nodes := []models.GraphNode{}
	for rows.Next() {
		var node models.GraphNode
		err := rows.Scan(
			&node.ID, &node.SourceType, &node.Title, &node.FullPath,
			&node.ClassificationLevel, &node.Status,
			&node.InboundCount, &node.OutboundCount, &node.TotalDegree,
			&node.IsOrphan, &node.IsHub, &node.IsAuthority,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan node: %w", err)
		}
		nodes = append(nodes, node)
	}

	return nodes, nil
}

// getGraphEdges retrieves all edges between accessible articles
func (s *LinkService) getGraphEdges(userClassificationLevel int) ([]models.GraphEdge, error) {
	query := `
		SELECT
			al.id, al.source_article_id, al.target_article_id,
			al.link_text, al.link_type, al.context_snippet
		FROM article_links al
		INNER JOIN articles sa ON al.source_article_type = sa.source_type AND al.source_article_id = sa.id
		INNER JOIN articles ta ON al.target_article_type = ta.source_type AND al.target_article_id = ta.id
		WHERE sa.classification_level <= $1
		  AND ta.classification_level <= $1
		  AND sa.status IN ('draft', 'published')
		  AND ta.status IN ('draft', 'published')
	`

	rows, err := s.db.Query(query, userClassificationLevel)
	if err != nil {
		return nil, fmt.Errorf("failed to query graph edges: %w", err)
	}
	defer rows.Close()

	edges := []models.GraphEdge{}
	for rows.Next() {
		var edge models.GraphEdge
		err := rows.Scan(
			&edge.ID, &edge.Source, &edge.Target,
			&edge.Label, &edge.Type, &edge.ContextSnippet,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan edge: %w", err)
		}
		edges = append(edges, edge)
	}

	return edges, nil
}

// GetArticleNeighborhood retrieves a subgraph centered on a specific article
func (s *LinkService) GetArticleNeighborhood(articleID uuid.UUID, sourceType models.ArticleSourceType, depth int, userClassificationLevel int) (*models.GraphData, error) {
	if depth < 1 {
		depth = 1
	}
	if depth > 5 {
		depth = 5 // Max depth to prevent performance issues
	}

	// Use recursive CTE to find neighbors up to N hops away
	query := `
		WITH RECURSIVE neighbors(id, source_type, depth, path) AS (
			-- Base case: the root article
			SELECT a.id, a.source_type, 0, ARRAY[a.id]
			FROM articles a
			WHERE a.id = $1 AND a.source_type = $2
			  AND a.classification_level <= $4

			UNION ALL

			-- Recursive case: articles connected to current neighbors
			SELECT DISTINCT
				CASE
					WHEN al.source_article_id = n.id THEN al.target_article_id
					ELSE al.source_article_id
				END as id,
				CASE
					WHEN al.source_article_id = n.id THEN al.target_article_type
					ELSE al.source_article_type
				END as source_type,
				n.depth + 1,
				n.path || CASE
					WHEN al.source_article_id = n.id THEN al.target_article_id
					ELSE al.source_article_id
				END
			FROM neighbors n
			INNER JOIN article_links al
				ON (al.source_article_id = n.id AND al.source_article_type = n.source_type)
				OR (al.target_article_id = n.id AND al.target_article_type = n.source_type)
			INNER JOIN articles a
				ON (a.id = al.source_article_id AND a.source_type = al.source_article_type)
				OR (a.id = al.target_article_id AND a.source_type = al.target_article_type)
			WHERE n.depth < $3
			  AND a.classification_level <= $4
			  AND a.status IN ('draft', 'published')
			  AND NOT (CASE
				WHEN al.source_article_id = n.id THEN al.target_article_id
				ELSE al.source_article_id
			  END = ANY(n.path)) -- Prevent cycles
		)
		SELECT DISTINCT
			a.id, a.source_type, a.title, a.full_path,
			a.classification_level, a.status,
			COALESCE(gs.inbound_links_count, 0),
			COALESCE(gs.outbound_links_count, 0),
			COALESCE(gs.total_degree, 0),
			COALESCE(gs.is_orphan, true),
			COALESCE(gs.is_hub, false),
			COALESCE(gs.is_authority, false)
		FROM neighbors n
		INNER JOIN articles a ON n.id = a.id AND n.source_type = a.source_type
		LEFT JOIN article_graph_stats gs
			ON a.source_type = gs.article_source_type AND a.id = gs.article_id
		ORDER BY a.title
	`

	rows, err := s.db.Query(query, articleID, sourceType, depth, userClassificationLevel)
	if err != nil {
		return nil, fmt.Errorf("failed to query neighborhood: %w", err)
	}
	defer rows.Close()

	nodes := []models.GraphNode{}
	nodeIDs := make(map[uuid.UUID]bool)
	for rows.Next() {
		var node models.GraphNode
		err := rows.Scan(
			&node.ID, &node.SourceType, &node.Title, &node.FullPath,
			&node.ClassificationLevel, &node.Status,
			&node.InboundCount, &node.OutboundCount, &node.TotalDegree,
			&node.IsOrphan, &node.IsHub, &node.IsAuthority,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan node: %w", err)
		}
		nodes = append(nodes, node)
		nodeIDs[node.ID] = true
	}

	// Get edges between these nodes
	edges, err := s.getEdgesBetweenNodes(nodeIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get edges: %w", err)
	}

	stats := s.calculateGraphStats(nodes, edges)

	return &models.GraphData{
		Nodes: nodes,
		Edges: edges,
		Stats: stats,
	}, nil
}

// getEdgesBetweenNodes retrieves edges between a specific set of nodes
func (s *LinkService) getEdgesBetweenNodes(nodeIDs map[uuid.UUID]bool) ([]models.GraphEdge, error) {
	if len(nodeIDs) == 0 {
		return []models.GraphEdge{}, nil
	}

	// Convert map to slice for SQL IN clause
	idSlice := make([]uuid.UUID, 0, len(nodeIDs))
	for id := range nodeIDs {
		idSlice = append(idSlice, id)
	}

	query := `
		SELECT id, source_article_id, target_article_id, link_text, link_type, context_snippet
		FROM article_links
		WHERE source_article_id = ANY($1) AND target_article_id = ANY($1)
	`

	rows, err := s.db.Query(query, idSlice)
	if err != nil {
		return nil, fmt.Errorf("failed to query edges: %w", err)
	}
	defer rows.Close()

	edges := []models.GraphEdge{}
	for rows.Next() {
		var edge models.GraphEdge
		err := rows.Scan(
			&edge.ID, &edge.Source, &edge.Target,
			&edge.Label, &edge.Type, &edge.ContextSnippet,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan edge: %w", err)
		}
		// Only include edges where both endpoints are in our node set
		if nodeIDs[edge.Source] && nodeIDs[edge.Target] {
			edges = append(edges, edge)
		}
	}

	return edges, nil
}

// calculateGraphStats computes statistics for the graph
func (s *LinkService) calculateGraphStats(nodes []models.GraphNode, edges []models.GraphEdge) models.GraphStats {
	stats := models.GraphStats{
		TotalNodes:            len(nodes),
		TotalEdges:            len(edges),
		NodesByClassification: make(map[int]int),
	}

	totalDegree := 0
	maxDegree := 0

	for _, node := range nodes {
		stats.NodesByClassification[node.ClassificationLevel]++

		if node.IsOrphan {
			stats.OrphansCount++
		}
		if node.IsHub {
			stats.HubsCount++
		}
		if node.IsAuthority {
			stats.AuthoritiesCount++
		}

		totalDegree += node.TotalDegree
		if node.TotalDegree > maxDegree {
			maxDegree = node.TotalDegree
		}
	}

	stats.MaxDegree = maxDegree
	if len(nodes) > 0 {
		stats.AverageDegree = float64(totalDegree) / float64(len(nodes))
	}

	return stats
}

// GetBrokenLinks retrieves all broken links in a specific article
func (s *LinkService) GetBrokenLinks(articleID uuid.UUID, sourceType models.ArticleSourceType) ([]models.BrokenLink, error) {
	// Get the article's content to extract wiki links
	var content string
	err := s.db.QueryRow(`
		SELECT content FROM articles
		WHERE id = $1 AND source_type = $2
	`, articleID, sourceType).Scan(&content)
	if err != nil {
		return nil, fmt.Errorf("failed to get article content: %w", err)
	}

	// Extract all wiki links from the content
	parsedLinks := s.ExtractLinksFromContent(content)
	brokenLinks := []models.BrokenLink{}

	// Check each link to see if the target exists
	for _, link := range parsedLinks {
		targetArticle, err := s.ResolveLink(link.TargetPath, sourceType)

		if err != nil {
			// Link is broken - target doesn't exist
			brokenLinks = append(brokenLinks, models.BrokenLink{
				LinkText:      link.OriginalText,
				TargetPath:    link.TargetPath,
				StartPosition: link.StartPosition,
				EndPosition:   link.EndPosition,
				Reason:        "Article not found",
			})
		} else if targetArticle.Status == "archived" {
			// Link points to archived article
			brokenLinks = append(brokenLinks, models.BrokenLink{
				LinkText:      link.OriginalText,
				TargetPath:    link.TargetPath,
				StartPosition: link.StartPosition,
				EndPosition:   link.EndPosition,
				Reason:        "Article is archived",
			})
		}
	}

	return brokenLinks, nil
}

// Helper function to extract context around a link
func extractContextSnippet(content string, start, end, contextLen int) *string {
	contentStart := start - contextLen
	if contentStart < 0 {
		contentStart = 0
	}

	contentEnd := end + contextLen
	if contentEnd > len(content) {
		contentEnd = len(content)
	}

	snippet := content[contentStart:contentEnd]
	snippet = strings.TrimSpace(snippet)

	if snippet == "" {
		return nil
	}

	return &snippet
}
