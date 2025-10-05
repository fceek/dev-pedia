package routes

import (
	"net/http"

	"fceek/dev-pedia/backend/internal/handlers"
	"fceek/dev-pedia/backend/internal/middleware"
	"fceek/dev-pedia/backend/internal/services"
)

// SetupClusterRoutes configures clustering-related HTTP routes
func SetupClusterRoutes(mux *http.ServeMux, clusterService *services.ClusterService, authMiddleware *middleware.AuthMiddleware) {
	clusterHandler := handlers.NewClusterHandler(clusterService)

	// Cluster endpoints with authentication
	mux.Handle("GET /api/graph/clusters", authMiddleware.RequireAuth()(http.HandlerFunc(clusterHandler.GetClusters)))
	mux.Handle("POST /api/graph/clusters/run", authMiddleware.RequireAuth()(http.HandlerFunc(clusterHandler.RunClustering)))
	mux.Handle("GET /api/articles/{source_type}/{id}/cluster", authMiddleware.RequireAuth()(http.HandlerFunc(clusterHandler.GetArticleCluster)))
}
