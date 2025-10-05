package models

import (
	"time"

	"github.com/google/uuid"
)

// ClusterInfo represents summary information about a cluster
type ClusterInfo struct {
	ClusterID                     int               `json:"cluster_id"`
	Algorithm                     string            `json:"algorithm"`
	Label                         string            `json:"label"`
	Size                          int               `json:"size"`
	Density                       float64           `json:"density"`
	AvgCentrality                 float64           `json:"avg_centrality"`
	RepresentativeID              uuid.UUID         `json:"representative_id"`
	RepresentativeSourceType      ArticleSourceType `json:"representative_source_type"`
	RepresentativeTitle           string            `json:"representative_title"`
	RepresentativePath            string            `json:"representative_path"`
	RepresentativeClassification  int               `json:"representative_classification"`
}

// ArticleClusterAssignment represents a single article's cluster assignment
type ArticleClusterAssignment struct {
	ClusterID       int       `json:"cluster_id"`
	ClusterLabel    string    `json:"cluster_label"`
	CentralityScore float64   `json:"centrality_score"`
	Algorithm       string    `json:"algorithm"`
	CalculatedAt    time.Time `json:"calculated_at"`
}

// GetClustersResponse represents the API response for clusters endpoint
type GetClustersResponse struct {
	Clusters  []ClusterInfo `json:"clusters"`
	Total     int           `json:"total"`
	Algorithm string        `json:"algorithm"`
}

// RunClusteringRequest represents request to run clustering algorithm
type RunClusteringRequest struct {
	Algorithm string `json:"algorithm"` // 'label_propagation', etc.
}

// RunClusteringResponse represents response from clustering operation
type RunClusteringResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	ClusterCount int    `json:"cluster_count"`
	Algorithm    string `json:"algorithm"`
}
