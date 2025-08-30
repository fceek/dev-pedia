package routes

import (
	"net/http"

	"fceek/dev-pedia/backend/internal/handlers"
	"fceek/dev-pedia/backend/internal/middleware"
	"fceek/dev-pedia/backend/internal/services"
)

// SetupArticleRoutes configures article-related HTTP routes
func SetupArticleRoutes(mux *http.ServeMux, articleService *services.ArticleService, authMiddleware *middleware.AuthMiddleware) {
	articleHandler := handlers.NewArticleHandler(articleService)

	// Article CRUD routes with authentication
	mux.Handle("POST /api/articles", authMiddleware.RequireAuth()(http.HandlerFunc(articleHandler.CreateArticle)))
	mux.Handle("GET /api/articles", authMiddleware.RequireAuth()(http.HandlerFunc(articleHandler.ListArticles)))
	mux.Handle("GET /api/articles/by-path", authMiddleware.RequireAuth()(http.HandlerFunc(articleHandler.GetArticleByPath)))
	mux.Handle("GET /api/articles/{source_type}/{id}", authMiddleware.RequireAuth()(http.HandlerFunc(articleHandler.GetArticle)))
	mux.Handle("PUT /api/articles/{source_type}/{id}", authMiddleware.RequireAuth()(http.HandlerFunc(articleHandler.UpdateArticle)))
	mux.Handle("DELETE /api/articles/{source_type}/{id}", authMiddleware.RequireAuth()(http.HandlerFunc(articleHandler.DeleteArticle)))
}