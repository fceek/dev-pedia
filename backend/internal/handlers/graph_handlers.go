package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"fceek/dev-pedia/backend/internal/middleware"
	"fceek/dev-pedia/backend/internal/models"
	"fceek/dev-pedia/backend/internal/services"
	"github.com/google/uuid"
)

type GraphHandler struct {
	linkService *services.LinkService
}

func NewGraphHandler(linkService *services.LinkService) *GraphHandler {
	return &GraphHandler{
		linkService: linkService,
	}
}

// @Summary Get article backlinks
// @Description Get all articles that link to the specified article
// @Tags graph
// @Produce json
// @Param source_type path string true "Source type" Enums(doc,git)
// @Param id path string true "Article ID"
// @Success 200 {object} models.GetBacklinksResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/articles/{source_type}/{id}/backlinks [get]
func (h *GraphHandler) GetBacklinks(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	token := authCtx.Token

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

	// Get backlinks filtered by user's classification level
	backlinks, err := h.linkService.GetBacklinks(id, sourceType, token.ClassificationLevel)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := models.GetBacklinksResponse{
		Backlinks: backlinks,
		Total:     len(backlinks),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// @Summary Get full knowledge graph
// @Description Get the complete knowledge graph filtered by user's classification level
// @Tags graph
// @Produce json
// @Param min_classification query int false "Minimum classification level"
// @Param max_classification query int false "Maximum classification level"
// @Param source_types query string false "Comma-separated source types (doc,git)"
// @Param only_hubs query bool false "Only show hub nodes"
// @Param only_authorities query bool false "Only show authority nodes"
// @Param only_orphans query bool false "Only show orphan nodes"
// @Param exclude_orphans query bool false "Exclude orphan nodes"
// @Success 200 {object} models.GetGraphResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/graph [get]
func (h *GraphHandler) GetFullGraph(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	token := authCtx.Token

	// Parse filter parameters
	filters := &models.GraphFilterOptions{}

	if minClass := r.URL.Query().Get("min_classification"); minClass != "" {
		if val, err := strconv.Atoi(minClass); err == nil {
			filters.MinClassificationLevel = &val
		}
	}

	if maxClass := r.URL.Query().Get("max_classification"); maxClass != "" {
		if val, err := strconv.Atoi(maxClass); err == nil {
			filters.MaxClassificationLevel = &val
		}
	}

	if sourceTypesStr := r.URL.Query().Get("source_types"); sourceTypesStr != "" {
		types := strings.Split(sourceTypesStr, ",")
		for _, t := range types {
			t = strings.TrimSpace(t)
			if t == "doc" || t == "git" {
				filters.SourceTypes = append(filters.SourceTypes, models.ArticleSourceType(t))
			}
		}
	}

	if r.URL.Query().Get("only_hubs") == "true" {
		filters.OnlyHubs = true
	}

	if r.URL.Query().Get("only_authorities") == "true" {
		filters.OnlyAuthorities = true
	}

	if r.URL.Query().Get("only_orphans") == "true" {
		filters.OnlyOrphans = true
	}

	if r.URL.Query().Get("exclude_orphans") == "true" {
		filters.ExcludeOrphans = true
	}

	// Get filtered graph
	graphData, err := h.linkService.GetFilteredGraph(token.ClassificationLevel, filters)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := models.GetGraphResponse{
		GraphData:          *graphData,
		UserClassification: token.ClassificationLevel,
		FilteredBy:         "classification level + filters",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// @Summary Get article neighborhood graph
// @Description Get a subgraph centered on a specific article (N-hop neighborhood)
// @Tags graph
// @Produce json
// @Param source_type path string true "Source type" Enums(doc,git)
// @Param id path string true "Article ID"
// @Param depth query int false "Depth of neighborhood (1-5)" default(2)
// @Success 200 {object} models.GetGraphResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/graph/article/{source_type}/{id} [get]
func (h *GraphHandler) GetArticleNeighborhood(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	token := authCtx.Token

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

	// Parse depth parameter (default: 2)
	depth := 2
	if depthStr := r.URL.Query().Get("depth"); depthStr != "" {
		if d, err := strconv.Atoi(depthStr); err == nil && d >= 1 && d <= 5 {
			depth = d
		}
	}

	// Get neighborhood graph
	graphData, err := h.linkService.GetArticleNeighborhood(id, sourceType, depth, token.ClassificationLevel)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := models.GetGraphResponse{
		GraphData:          *graphData,
		UserClassification: token.ClassificationLevel,
		FilteredBy:         "neighborhood",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// @Summary Get graph statistics
// @Description Get overall statistics about the knowledge graph
// @Tags graph
// @Produce json
// @Success 200 {object} models.GraphStats
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/graph/stats [get]
func (h *GraphHandler) GetGraphStats(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	token := authCtx.Token

	// Get full graph to calculate stats
	graphData, err := h.linkService.GetFullGraph(token.ClassificationLevel)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(graphData.Stats)
}

// @Summary Get broken links in an article
// @Description Get all broken wiki links (non-existent or archived targets) in the specified article
// @Tags graph
// @Produce json
// @Param source_type path string true "Source type" Enums(doc,git)
// @Param id path string true "Article ID"
// @Success 200 {object} models.GetBrokenLinksResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/articles/{source_type}/{id}/broken-links [get]
func (h *GraphHandler) GetBrokenLinks(w http.ResponseWriter, r *http.Request) {
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

	// Get broken links
	brokenLinks, err := h.linkService.GetBrokenLinks(id, sourceType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := models.GetBrokenLinksResponse{
		BrokenLinks: brokenLinks,
		Total:       len(brokenLinks),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
