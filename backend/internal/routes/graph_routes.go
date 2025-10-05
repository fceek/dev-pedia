package routes

import (
	"net/http"

	"fceek/dev-pedia/backend/internal/handlers"
	"fceek/dev-pedia/backend/internal/middleware"
	"fceek/dev-pedia/backend/internal/services"
)

// SetupGraphRoutes configures graph and link-related HTTP routes
func SetupGraphRoutes(mux *http.ServeMux, linkService *services.LinkService, authMiddleware *middleware.AuthMiddleware) {
	graphHandler := handlers.NewGraphHandler(linkService)

	// Graph endpoints with authentication
	mux.Handle("GET /api/graph", authMiddleware.RequireAuth()(http.HandlerFunc(graphHandler.GetFullGraph)))
	mux.Handle("GET /api/graph/stats", authMiddleware.RequireAuth()(http.HandlerFunc(graphHandler.GetGraphStats)))
	mux.Handle("GET /api/graph/article/{source_type}/{id}", authMiddleware.RequireAuth()(http.HandlerFunc(graphHandler.GetArticleNeighborhood)))

	// Article link analysis endpoints
	mux.Handle("GET /api/articles/{source_type}/{id}/backlinks", authMiddleware.RequireAuth()(http.HandlerFunc(graphHandler.GetBacklinks)))
	mux.Handle("GET /api/articles/{source_type}/{id}/broken-links", authMiddleware.RequireAuth()(http.HandlerFunc(graphHandler.GetBrokenLinks)))
}
