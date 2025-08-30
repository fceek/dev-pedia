package routes

import (
	"fmt"
	"net/http"
)

// SetupHealthRoutes configures health check routes
func SetupHealthRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", HealthHandler)
}

// HealthHandler handles health check requests
// @Summary Health check
// @Description Check if the service is running
// @Tags health
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /health [get]
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status": "ok", "message": "{DEV} Pedia backend is running"}`)
}