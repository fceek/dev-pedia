package services

import (
	"database/sql"
	"fmt"

	"fceek/dev-pedia/backend/internal/models"
	"github.com/google/uuid"
)

type ClusterService struct {
	db          *sql.DB
	linkService *LinkService
}

func NewClusterService(db *sql.DB, linkService *LinkService) *ClusterService {
	return &ClusterService{
		db:          db,
		linkService: linkService,
	}
}

// ClusterResult represents a detected cluster/community
type ClusterResult struct {
	ClusterID   int
	Articles    []uuid.UUID
	Size        int
	Density     float64
	Centrality  map[uuid.UUID]float64
	Label       string
}

// DetectCommunities runs community detection using label propagation algorithm
func (s *ClusterService) DetectCommunities(userClassificationLevel int, algorithm string) ([]ClusterResult, error) {
	if algorithm == "" {
		algorithm = "label_propagation"
	}

	// Get full graph for clustering
	graphData, err := s.linkService.GetFullGraph(userClassificationLevel)
	if err != nil {
		return nil, fmt.Errorf("failed to get graph data: %w", err)
	}

	// Run clustering algorithm
	var clusters []ClusterResult
	switch algorithm {
	case "label_propagation":
		clusters = s.labelPropagation(graphData)
	default:
		return nil, fmt.Errorf("unsupported algorithm: %s", algorithm)
	}

	return clusters, nil
}

// labelPropagation implements simple label propagation community detection
func (s *ClusterService) labelPropagation(graphData *models.GraphData) []ClusterResult {
	// Initialize: each node gets its own label (cluster ID)
	labels := make(map[string]int)
	nodeIndex := make(map[string]*models.GraphNode)

	for i, node := range graphData.Nodes {
		labels[node.ID.String()] = i
		nodeIndex[node.ID.String()] = &graphData.Nodes[i]
	}

	// Build adjacency list
	adjacency := make(map[string][]string)
	for _, edge := range graphData.Edges {
		sourceID := edge.Source.String()
		targetID := edge.Target.String()

		adjacency[sourceID] = append(adjacency[sourceID], targetID)
		adjacency[targetID] = append(adjacency[targetID], sourceID)
	}

	// Iterate until convergence (max 100 iterations)
	maxIterations := 100
	changed := true

	for iteration := 0; iteration < maxIterations && changed; iteration++ {
		changed = false

		// Process nodes in random order (simplified: use existing order)
		for nodeID := range labels {
			// Count neighbor labels
			labelCounts := make(map[int]int)
			neighbors := adjacency[nodeID]

			for _, neighborID := range neighbors {
				neighborLabel := labels[neighborID]
				labelCounts[neighborLabel]++
			}

			// Find most common label among neighbors
			maxCount := 0
			bestLabel := labels[nodeID]

			for label, count := range labelCounts {
				if count > maxCount {
					maxCount = count
					bestLabel = label
				}
			}

			// Update label if changed
			if bestLabel != labels[nodeID] {
				labels[nodeID] = bestLabel
				changed = true
			}
		}
	}

	// Group nodes by cluster label
	clusterMembers := make(map[int][]uuid.UUID)
	for nodeIDStr, label := range labels {
		nodeID, _ := uuid.Parse(nodeIDStr)
		clusterMembers[label] = append(clusterMembers[label], nodeID)
	}

	// Build cluster results
	results := []ClusterResult{}
	clusterID := 0

	for _, members := range clusterMembers {
		if len(members) == 0 {
			continue
		}

		// Calculate cluster density
		density := s.calculateClusterDensity(members, graphData.Edges)

		// Calculate centrality scores
		centrality := s.calculateCentrality(members, adjacency)

		// Generate label from most central node
		label := s.generateClusterLabel(members, centrality, nodeIndex)

		results = append(results, ClusterResult{
			ClusterID:  clusterID,
			Articles:   members,
			Size:       len(members),
			Density:    density,
			Centrality: centrality,
			Label:      label,
		})

		clusterID++
	}

	return results
}

// calculateClusterDensity computes the link density within a cluster
func (s *ClusterService) calculateClusterDensity(members []uuid.UUID, edges []models.GraphEdge) float64 {
	if len(members) <= 1 {
		return 0.0
	}

	// Create member set for fast lookup
	memberSet := make(map[uuid.UUID]bool)
	for _, id := range members {
		memberSet[id] = true
	}

	// Count internal edges
	internalEdges := 0
	for _, edge := range edges {
		if memberSet[edge.Source] && memberSet[edge.Target] {
			internalEdges++
		}
	}

	// Maximum possible edges in cluster
	n := float64(len(members))
	maxEdges := (n * (n - 1)) / 2

	if maxEdges == 0 {
		return 0.0
	}

	return float64(internalEdges) / maxEdges
}

// calculateCentrality computes degree centrality for nodes in cluster
func (s *ClusterService) calculateCentrality(members []uuid.UUID, adjacency map[string][]string) map[uuid.UUID]float64 {
	centrality := make(map[uuid.UUID]float64)

	// Create member set
	memberSet := make(map[string]bool)
	for _, id := range members {
		memberSet[id.String()] = true
	}

	// Calculate degree centrality within cluster
	for _, id := range members {
		neighbors := adjacency[id.String()]
		internalDegree := 0

		for _, neighborID := range neighbors {
			if memberSet[neighborID] {
				internalDegree++
			}
		}

		centrality[id] = float64(internalDegree)
	}

	// Normalize by cluster size
	maxDegree := float64(len(members) - 1)
	if maxDegree > 0 {
		for id := range centrality {
			centrality[id] = centrality[id] / maxDegree
		}
	}

	return centrality
}

// generateClusterLabel creates a label from the most central article
func (s *ClusterService) generateClusterLabel(members []uuid.UUID, centrality map[uuid.UUID]float64, nodeIndex map[string]*models.GraphNode) string {
	var mostCentral uuid.UUID
	maxCentrality := -1.0

	for id, score := range centrality {
		if score > maxCentrality {
			maxCentrality = score
			mostCentral = id
		}
	}

	if node := nodeIndex[mostCentral.String()]; node != nil {
		return fmt.Sprintf("Cluster: %s", node.Title)
	}

	return fmt.Sprintf("Cluster %d", len(members))
}

// SaveClusters persists cluster results to the database
func (s *ClusterService) SaveClusters(clusters []ClusterResult, algorithm string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Clear existing clusters for this algorithm
	_, err = tx.Exec("DELETE FROM article_clusters WHERE algorithm = $1", algorithm)
	if err != nil {
		return fmt.Errorf("failed to delete old clusters: %w", err)
	}

	_, err = tx.Exec("DELETE FROM cluster_metadata WHERE algorithm = $1", algorithm)
	if err != nil {
		return fmt.Errorf("failed to delete old metadata: %w", err)
	}

	// Insert cluster metadata
	for _, cluster := range clusters {
		// Find representative article (most central)
		var representativeID uuid.UUID
		var representativeType models.ArticleSourceType
		maxCentrality := -1.0

		for articleID, centrality := range cluster.Centrality {
			if centrality > maxCentrality {
				maxCentrality = centrality
				representativeID = articleID
			}
		}

		// Get article source type
		err = s.db.QueryRow(`
			SELECT source_type FROM articles WHERE id = $1 LIMIT 1
		`, representativeID).Scan(&representativeType)
		if err != nil {
			representativeType = models.ArticleSourceDoc // Default
		}

		// Insert cluster metadata
		_, err = tx.Exec(`
			INSERT INTO cluster_metadata (
				cluster_id, algorithm, size, density, label,
				representative_article_id, representative_article_type
			) VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, cluster.ClusterID, algorithm, cluster.Size, cluster.Density,
			cluster.Label, representativeID, representativeType)
		if err != nil {
			return fmt.Errorf("failed to insert cluster metadata: %w", err)
		}

		// Insert article cluster assignments
		for articleID, centrality := range cluster.Centrality {
			var sourceType models.ArticleSourceType
			err = s.db.QueryRow(`
				SELECT source_type FROM articles WHERE id = $1
			`, articleID).Scan(&sourceType)
			if err != nil {
				continue // Skip if article not found
			}

			_, err = tx.Exec(`
				INSERT INTO article_clusters (
					article_id, article_source_type, cluster_id,
					cluster_label, centrality_score, algorithm
				) VALUES ($1, $2, $3, $4, $5, $6)
			`, articleID, sourceType, cluster.ClusterID,
				cluster.Label, centrality, algorithm)
			if err != nil {
				return fmt.Errorf("failed to insert article cluster: %w", err)
			}
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Refresh materialized view
	_, err = s.db.Exec("SELECT refresh_cluster_stats()")
	if err != nil {
		// Log but don't fail
		fmt.Printf("Warning: failed to refresh cluster stats: %v\n", err)
	}

	return nil
}

// GetClusters retrieves all clusters for a given algorithm
func (s *ClusterService) GetClusters(algorithm string, userClassificationLevel int) ([]models.ClusterInfo, error) {
	query := `
		SELECT
			cs.cluster_id,
			cs.algorithm,
			cs.label,
			cs.size,
			cs.density,
			cs.avg_centrality,
			cs.representative_id,
			cs.representative_source_type,
			cs.representative_title,
			cs.representative_path,
			cs.representative_classification
		FROM cluster_stats_view cs
		WHERE cs.algorithm = $1
		  AND cs.representative_classification <= $2
		ORDER BY cs.size DESC
	`

	rows, err := s.db.Query(query, algorithm, userClassificationLevel)
	if err != nil {
		return nil, fmt.Errorf("failed to query clusters: %w", err)
	}
	defer rows.Close()

	clusters := []models.ClusterInfo{}
	for rows.Next() {
		var cluster models.ClusterInfo
		err := rows.Scan(
			&cluster.ClusterID,
			&cluster.Algorithm,
			&cluster.Label,
			&cluster.Size,
			&cluster.Density,
			&cluster.AvgCentrality,
			&cluster.RepresentativeID,
			&cluster.RepresentativeSourceType,
			&cluster.RepresentativeTitle,
			&cluster.RepresentativePath,
			&cluster.RepresentativeClassification,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan cluster: %w", err)
		}
		clusters = append(clusters, cluster)
	}

	return clusters, nil
}

// GetArticleCluster retrieves cluster assignment for a specific article
func (s *ClusterService) GetArticleCluster(articleID uuid.UUID, sourceType models.ArticleSourceType, algorithm string) (*models.ArticleClusterAssignment, error) {
	query := `
		SELECT
			ac.cluster_id,
			ac.cluster_label,
			ac.centrality_score,
			ac.algorithm,
			ac.calculated_at
		FROM article_clusters ac
		WHERE ac.article_id = $1
		  AND ac.article_source_type = $2
		  AND ac.algorithm = $3
	`

	var assignment models.ArticleClusterAssignment
	err := s.db.QueryRow(query, articleID, sourceType, algorithm).Scan(
		&assignment.ClusterID,
		&assignment.ClusterLabel,
		&assignment.CentralityScore,
		&assignment.Algorithm,
		&assignment.CalculatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil // No cluster assignment
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get article cluster: %w", err)
	}

	return &assignment, nil
}
