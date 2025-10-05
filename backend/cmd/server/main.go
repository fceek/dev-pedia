// @title {DEV} Pedia API
// @version 1.0
// @description {DEV} Pedia
// @contact.name API Support

// @host localhost:9001
// @BasePath /

// @securityDefinitions.apikey Bearer
// @in header
// @name Authorization
// @description Bearer token for regular authentication

// @securityDefinitions.apikey GodToken
// @in header
// @name Authorization
// @description God token for bootstrap operations

package main

import (
	"fceek/dev-pedia/backend/internal/jobs"
	"fceek/dev-pedia/backend/internal/scheduler"
	"fceek/dev-pedia/backend/internal/services"
	"log"
	"net/http"
	"os"
	"path/filepath"

	_ "fceek/dev-pedia/backend/docs"
	"fceek/dev-pedia/backend/internal/auth"
	"fceek/dev-pedia/backend/internal/database"
	"fceek/dev-pedia/backend/internal/middleware"
	"fceek/dev-pedia/backend/internal/routes"

	httpSwagger "github.com/swaggo/http-swagger"
)

func main() {
	// Get configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Initialize database connection
	dbConfig := database.Config{
		DatabaseURL: databaseURL,
	}

	db, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize database schema
	sqlDir := filepath.Join("sql")
	if err := db.InitializeSchema(sqlDir); err != nil {
		log.Fatal("Failed to initialize database schema:", err)
	}

	// Initialize services
	tokenService := auth.NewTokenService(db)
	authMiddleware := middleware.NewAuthMiddleware(tokenService)
	articleService := services.NewArticleService(db.DB)
	linkService := services.NewLinkService(db.DB)
	clusterService := services.NewClusterService(db.DB, linkService)

	// Initialize jobs and scheduler
	tokenExpirationJob := jobs.NewTokenExpirationJob(db)
	jobScheduler := scheduler.NewScheduler(tokenExpirationJob)

	// Start background jobs
	jobScheduler.Start()

	// Setup routes
	mux := http.NewServeMux()
	routes.SetupHealthRoutes(mux)
	routes.SetupTokenRoutes(mux, tokenService, authMiddleware)
	routes.SetupArticleRoutes(mux, articleService, authMiddleware)
	routes.SetupGraphRoutes(mux, linkService, authMiddleware)
	routes.SetupClusterRoutes(mux, clusterService, authMiddleware)

	// Add Swagger documentation endpoint
	// Use relative URL so it works with Docker port mapping
	mux.HandleFunc("/swagger/", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))

	// Add CORS middleware for development
	corsHandler := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}

	// Start server
	log.Printf("Server starting on port %s", port)
	log.Printf("Swagger documentation available at: http://localhost:%s/swagger/", port)
	if err := http.ListenAndServe(":"+port, corsHandler(mux)); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
