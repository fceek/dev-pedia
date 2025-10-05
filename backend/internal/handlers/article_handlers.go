package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"fceek/dev-pedia/backend/internal/auth"
	"fceek/dev-pedia/backend/internal/middleware"
	"fceek/dev-pedia/backend/internal/models"
	"fceek/dev-pedia/backend/internal/services"
	"github.com/google/uuid"
)

type ArticleHandler struct {
	articleService *services.ArticleService
	authorizer     *auth.ArticleAuthorizer
}

func NewArticleHandler(articleService *services.ArticleService) *ArticleHandler {
	return &ArticleHandler{
		articleService: articleService,
		authorizer:     auth.NewArticleAuthorizer(nil), // Use default rules
	}
}

// @Summary Create a new article
// @Description Create a new article with the given data
// @Tags articles
// @Accept json
// @Produce json
// @Param article body models.CreateArticleRequest true "Article data"
// @Success 201 {object} models.Article
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/articles [post]
func (h *ArticleHandler) CreateArticle(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	token := authCtx.Token

	var req models.CreateArticleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Use centralized authorization
	if err := h.authorizer.ValidateCreateRequest(token, &req); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	article, err := h.articleService.Create(&req, token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(article)
}

// @Summary Get article by ID
// @Description Get an article by its ID
// @Tags articles
// @Produce json
// @Param source_type path string true "Source type" Enums(doc,git)
// @Param id path string true "Article ID"
// @Success 200 {object} models.ArticleWithTags
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security Bearer
// @Router /api/articles/{source_type}/{id} [get]
func (h *ArticleHandler) GetArticle(w http.ResponseWriter, r *http.Request) {
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

	article, err := h.articleService.GetByID(sourceType, id)
	if err != nil {
		if err.Error() == "article not found" {
			http.Error(w, "Article not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Use centralized authorization
	if err := h.authorizer.ValidateReadRequest(token, &article.Article); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	// Process content with classification-based secret filtering
	processedArticle, err := h.articleService.ProcessContentForUser(&article.Article, token, r.RemoteAddr, r.UserAgent())
	if err != nil {
		http.Error(w, "Failed to process article content", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(processedArticle)
}

// @Summary Get article by path
// @Description Get an article by its full path
// @Tags articles
// @Produce json
// @Param source_type query string true "Source type" Enums(doc,git)
// @Param path query string true "Full path"
// @Success 200 {object} models.ArticleWithTags
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security Bearer
// @Router /api/articles/by-path [get]
func (h *ArticleHandler) GetArticleByPath(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	token := authCtx.Token

	// Parse query parameters
	sourceTypeStr := r.URL.Query().Get("source_type")
	sourceType := models.ArticleSourceType(sourceTypeStr)
	if sourceType != models.ArticleSourceDoc && sourceType != models.ArticleSourceGit {
		http.Error(w, "Invalid or missing source_type parameter", http.StatusBadRequest)
		return
	}

	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "Missing path parameter", http.StatusBadRequest)
		return
	}

	article, err := h.articleService.GetByPath(sourceType, path)
	if err != nil {
		if err.Error() == "article not found" {
			http.Error(w, "Article not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Use centralized authorization
	if err := h.authorizer.ValidateReadRequest(token, &article.Article); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	// Process content with classification-based secret filtering
	processedArticle, err := h.articleService.ProcessContentForUser(&article.Article, token, r.RemoteAddr, r.UserAgent())
	if err != nil {
		http.Error(w, "Failed to process article content", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(processedArticle)
}

// @Summary List articles
// @Description List articles with optional filtering and pagination
// @Tags articles
// @Produce json
// @Param source_type query string false "Source type" Enums(doc,git)
// @Param parent_path query string false "Parent path filter"
// @Param status query string false "Status filter" Enums(draft,published,archived)
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Success 200 {object} models.ArticleListResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/articles [get]
func (h *ArticleHandler) ListArticles(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	token := authCtx.Token

	// Parse query parameters
	var sourceType *models.ArticleSourceType
	if sourceTypeStr := r.URL.Query().Get("source_type"); sourceTypeStr != "" {
		st := models.ArticleSourceType(sourceTypeStr)
		if st != models.ArticleSourceDoc && st != models.ArticleSourceGit {
			http.Error(w, "Invalid source_type parameter", http.StatusBadRequest)
			return
		}
		sourceType = &st
	}

	var parentPath *string
	if pp := r.URL.Query().Get("parent_path"); pp != "" {
		parentPath = &pp
	}

	var status *models.ArticleStatus
	if statusStr := r.URL.Query().Get("status"); statusStr != "" {
		s := models.ArticleStatus(statusStr)
		if s != models.ArticleStatusDraft && s != models.ArticleStatusPublished && s != models.ArticleStatusArchived {
			http.Error(w, "Invalid status parameter", http.StatusBadRequest)
			return
		}
		status = &s
	}

	page := 1
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	pageSize := 20
	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}

	// Use user's classification level as filter
	classificationLevel := token.ClassificationLevel

	result, err := h.articleService.List(sourceType, parentPath, status, &classificationLevel, page, pageSize)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// @Summary Update article
// @Description Update an existing article
// @Tags articles
// @Accept json
// @Produce json
// @Param source_type path string true "Source type" Enums(doc,git)
// @Param id path string true "Article ID"
// @Param article body models.UpdateArticleRequest true "Updated article data"
// @Success 200 {object} models.Article
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/articles/{source_type}/{id} [put]
func (h *ArticleHandler) UpdateArticle(w http.ResponseWriter, r *http.Request) {
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

	// Get existing article to validate permissions
	existingArticle, err := h.articleService.GetByID(sourceType, id)
	if err != nil {
		if err.Error() == "article not found" {
			http.Error(w, "Article not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var req models.UpdateArticleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Use centralized authorization
	if err := h.authorizer.ValidateUpdateRequest(token, &existingArticle.Article, &req); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	article, err := h.articleService.Update(sourceType, id, &req, token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(article)
}

// @Summary Delete article
// @Description Delete an article by ID
// @Tags articles
// @Param source_type path string true "Source type" Enums(doc,git)
// @Param id path string true "Article ID"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/articles/{source_type}/{id} [delete]
func (h *ArticleHandler) DeleteArticle(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	token := authCtx.Token

	// Use centralized authorization
	if err := h.authorizer.ValidateDeleteRequest(token); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
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

	err = h.articleService.Delete(sourceType, id)
	if err != nil {
		if err.Error() == "article not found" {
			http.Error(w, "Article not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary Search articles
// @Description Search articles by title or path for autocomplete
// @Tags articles
// @Produce json
// @Param q query string true "Search query"
// @Param limit query int false "Result limit (max 50)" default(10)
// @Success 200 {object} ArticleSearchResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security Bearer
// @Router /api/articles/search [get]
func (h *ArticleHandler) SearchArticles(w http.ResponseWriter, r *http.Request) {
	// Get auth context
	authCtx, ok := middleware.GetAuthContext(r)
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	token := authCtx.Token

	// Parse query parameter
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Missing query parameter 'q'", http.StatusBadRequest)
		return
	}

	// Parse limit parameter
	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	// Search articles
	articles, err := h.articleService.SearchByTitleOrPath(query, token.ClassificationLevel, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Build response with simplified article data for autocomplete
	suggestions := make([]ArticleSuggestion, 0, len(articles))
	for _, article := range articles {
		suggestions = append(suggestions, ArticleSuggestion{
			ID:                  article.ID.String(),
			SourceType:          string(article.SourceType),
			Title:               article.Title,
			FullPath:            article.FullPath,
			ClassificationLevel: article.ClassificationLevel,
		})
	}

	response := ArticleSearchResponse{
		Suggestions: suggestions,
		Total:       len(suggestions),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// ArticleSuggestion represents a search suggestion for autocomplete
type ArticleSuggestion struct {
	ID                  string `json:"id"`
	SourceType          string `json:"source_type"`
	Title               string `json:"title"`
	FullPath            string `json:"full_path"`
	ClassificationLevel int    `json:"classification_level"`
}

// ArticleSearchResponse represents the search response
type ArticleSearchResponse struct {
	Suggestions []ArticleSuggestion `json:"suggestions"`
	Total       int                 `json:"total"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}