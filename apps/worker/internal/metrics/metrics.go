package metrics

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
)

var (
	// JobsProcessedTotal counts jobs processed by status
	JobsProcessedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "jobs_processed_total",
			Help: "Total number of jobs processed by status (completed/failed)",
		},
		[]string{"status"},
	)

	// JobDurationSeconds measures job processing duration by resolution
	JobDurationSeconds = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "job_duration_seconds",
			Help:    "Job processing duration in seconds by resolution",
			Buckets: []float64{1, 5, 10, 30, 60, 120, 300, 600}, // 1s to 10min
		},
		[]string{"resolution"},
	)

	// TranscodeErrorsTotal counts transcode errors by resolution
	TranscodeErrorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "transcode_errors_total",
			Help: "Total number of transcode errors by resolution",
		},
		[]string{"resolution"},
	)

	// QueueDepth shows the number of pending jobs in the queue
	QueueDepth = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "queue_depth",
			Help: "Number of jobs waiting in the queue",
		},
	)

	// ActiveJobs shows the number of jobs currently being processed
	ActiveJobs = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_jobs",
			Help: "Number of jobs currently being processed",
		},
	)
)

// RecordJobCompleted increments the completed jobs counter
func RecordJobCompleted() {
	JobsProcessedTotal.WithLabelValues("completed").Inc()
}

// RecordJobFailed increments the failed jobs counter
func RecordJobFailed() {
	JobsProcessedTotal.WithLabelValues("failed").Inc()
}

// RecordJobDuration records the duration of processing a job for a specific resolution
func RecordJobDuration(resolution string, duration time.Duration) {
	JobDurationSeconds.WithLabelValues(resolution).Observe(duration.Seconds())
}

// RecordTranscodeError increments the transcode error counter for a resolution
func RecordTranscodeError(resolution string) {
	TranscodeErrorsTotal.WithLabelValues(resolution).Inc()
}

// IncrementActiveJobs increments the active jobs gauge
func IncrementActiveJobs() {
	ActiveJobs.Inc()
}

// DecrementActiveJobs decrements the active jobs gauge
func DecrementActiveJobs() {
	ActiveJobs.Dec()
}

// StartMetricsServer starts an HTTP server for Prometheus metrics on the given port
func StartMetricsServer(port string) *http.Server {
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	go func() {
		log.Printf("Metrics server starting on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Metrics server error: %v", err)
		}
	}()

	return srv
}

// StartQueueDepthUpdater periodically updates the queue depth metric
func StartQueueDepthUpdater(ctx context.Context, redisClient *redis.Client, queueKey string, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			depth, err := redisClient.LLen(ctx, queueKey).Result()
			if err != nil {
				log.Printf("Failed to get queue depth: %v", err)
				continue
			}
			QueueDepth.Set(float64(depth))
		}
	}
}
