package handlers

import (
	"encoding/json"
	"net/http"

	"fceek/dev-pedia/backend/internal/middleware"
	"fceek/dev-pedia/backend/internal/models"
	"fceek/dev-pedia/backend/internal/services"
	"github.com/google/uuid"
)

type ClusterHandler struct {
	clusterService *services.ClusterService
}

func NewClusterHandler(clusterService *services.ClusterService) *ClusterHandler {
	return &ClusterHandler{
		clusterService: clusterService,
	}
}

// @Summary Get graph clusters
// @Description Get all detected clusters/communities in the knowledge graph
// @Tags clustering
// @Produce json
// @Param algorithm query string false "Clustering algorithm" default(label_propagation)
// @Success 200 {object} models.GetClustersResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/graph/clusters [get]
func (h *ClusterHandler) GetClusters(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	token := authCtx.Token

	// Get algorithm parameter
	algorithm := r.URL.Query().Get("algorithm")
	if algorithm == "" {
		algorithm = "label_propagation"
	}

	// Get clusters
	clusters, err := h.clusterService.GetClusters(algorithm, token.ClassificationLevel)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := models.GetClustersResponse{
		Clusters:  clusters,
		Total:     len(clusters),
		Algorithm: algorithm,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// @Summary Run clustering algorithm
// @Description Detect communities in the knowledge graph using specified algorithm
// @Tags clustering
// @Accept json
// @Produce json
// @Param request body models.RunClusteringRequest true "Clustering request"
// @Success 200 {object} models.RunClusteringResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/graph/clusters/run [post]
func (h *ClusterHandler) RunClustering(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	token := authCtx.Token

	// Only high-level users can run clustering (classification level 4+)
	if token.ClassificationLevel < 4 {
		http.Error(w, "Insufficient permissions to run clustering", http.StatusForbidden)
		return
	}

	// Parse request body
	var req models.RunClusteringRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Algorithm == "" {
		req.Algorithm = "label_propagation"
	}

	// Run clustering
	clusters, err := h.clusterService.DetectCommunities(token.ClassificationLevel, req.Algorithm)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Save results
	err = h.clusterService.SaveClusters(clusters, req.Algorithm)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := models.RunClusteringResponse{
		Success:      true,
		Message:      "Clustering completed successfully",
		ClusterCount: len(clusters),
		Algorithm:    req.Algorithm,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// @Summary Get article's cluster assignment
// @Description Get the cluster assignment for a specific article
// @Tags clustering
// @Produce json
// @Param source_type path string true "Source type" Enums(doc,git)
// @Param id path string true "Article ID"
// @Param algorithm query string false "Clustering algorithm" default(label_propagation)
// @Success 200 {object} models.ArticleClusterAssignment
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/articles/{source_type}/{id}/cluster [get]
func (h *ClusterHandler) GetArticleCluster(w http.ResponseWriter, r *http.Request) {
	// Get auth context (authentication only, no token data needed)
	if _, ok := middleware.GetAuthContext(r); !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	// Parse source type
	sourceTypeStr := r.PathValue("source_type")
	sourceType := models.ArticleSourceType(sourceTypeStr)
	if sourceType != models.ArticleSourceDoc && sourceType != models.ArticleSourceGit {
		http.Error(w, "Invalid source type", http.StatusBadRequest)
		return
	}

	// Parse article ID
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid article ID", http.StatusBadRequest)
		return
	}

	// Get algorithm parameter
	algorithm := r.URL.Query().Get("algorithm")
	if algorithm == "" {
		algorithm = "label_propagation"
	}

	// Get cluster assignment
	assignment, err := h.clusterService.GetArticleCluster(id, sourceType, algorithm)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if assignment == nil {
		http.Error(w, "No cluster assignment found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(assignment)
}
