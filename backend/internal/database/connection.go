package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/lib/pq"
)

// DB holds the database connection
type DB struct {
	*sql.DB
}

// Config holds database configuration
type Config struct {
	DatabaseURL string
}

// Connect establishes a connection to the PostgreSQL database
func Connect(config Config) (*DB, error) {
	db, err := sql.Open("postgres", config.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{db}, nil
}

// InitializeSchema reads and executes SQL files with migration tracking
func (db *DB) InitializeSchema(sqlDir string) error {
	// Create migrations table to track executed SQL files
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename VARCHAR(255) PRIMARY KEY,
			executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	// SQL files to execute in order
	sqlFiles := []string{
		"01_token_management.sql",
		"02_audit_logging.sql",
		"03_article_engine.sql",
		"04_content_secrets.sql",
	}

	for _, filename := range sqlFiles {
		// Check if this file has already been executed
		var exists bool
		err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 FROM schema_migrations WHERE filename = $1
			)
		`, filename).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check migration status for %s: %w", filename, err)
		}

		if exists {
			fmt.Printf("Skipping %s (already executed)\n", filename)
			continue
		}

		// Execute the SQL file
		filePath := filepath.Join(sqlDir, filename)
		content, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to read SQL file %s: %w", filename, err)
		}

		_, err = db.Exec(string(content))
		if err != nil {
			return fmt.Errorf("failed to execute SQL file %s: %w", filename, err)
		}

		// Record that this file has been executed
		_, err = db.Exec(`
			INSERT INTO schema_migrations (filename) VALUES ($1)
		`, filename)
		if err != nil {
			return fmt.Errorf("failed to record migration %s: %w", filename, err)
		}

		fmt.Printf("Executed: %s\n", filename)
	}

	return nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.DB.Close()
}
