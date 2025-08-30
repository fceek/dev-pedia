package scheduler

import (
	"log"
	"time"

	"fceek/dev-pedia/backend/internal/jobs"
)

// Scheduler handles periodic job execution
type Scheduler struct {
	tokenExpirationJob *jobs.TokenExpirationJob
	stopChan           chan struct{}
}

// NewScheduler creates a new scheduler
func NewScheduler(tokenExpirationJob *jobs.TokenExpirationJob) *Scheduler {
	return &Scheduler{
		tokenExpirationJob: tokenExpirationJob,
		stopChan:           make(chan struct{}),
	}
}

// Start begins running scheduled jobs
func (s *Scheduler) Start() {
	log.Println("Scheduler started")

	// Run token expiration check every 5 minutes
	go s.runPeriodicJob("token-expiration", 5*time.Minute, func() {
		if err := s.tokenExpirationJob.MarkExpiredTokens(); err != nil {
			log.Printf("Token expiration job failed: %v", err)
		}
	})

	// Run token cleanup once daily at startup + 24h intervals
	go s.runPeriodicJob("token-cleanup", 24*time.Hour, func() {
		// Clean up tokens expired for more than 30 days
		if err := s.tokenExpirationJob.CleanupExpiredTokens(30 * 24 * time.Hour); err != nil {
			log.Printf("Token cleanup job failed: %v", err)
		}
	})
}

// Stop gracefully stops the scheduler
func (s *Scheduler) Stop() {
	log.Println("Stopping scheduler...")
	close(s.stopChan)
}

// runPeriodicJob runs a job at specified intervals
func (s *Scheduler) runPeriodicJob(name string, interval time.Duration, jobFunc func()) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("Started %s job (interval: %v)", name, interval)

	// Run immediately on start
	jobFunc()

	for {
		select {
		case <-ticker.C:
			jobFunc()
		case <-s.stopChan:
			log.Printf("Stopped %s job", name)
			return
		}
	}
}