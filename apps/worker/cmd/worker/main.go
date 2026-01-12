package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/worker/internal/config"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/worker/internal/db"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/worker/internal/metrics"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/worker/internal/queue"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/worker/internal/storage"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/worker/internal/transcoder"
)

func main() {
	log.Println("Worker starting...")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to PostgreSQL
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Test database connection
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Connected to PostgreSQL")

	// Initialize sqlc queries
	queries := db.New(pool)

	// Connect to Redis
	consumer, err := queue.NewConsumer(cfg.RedisAddr)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer consumer.Close()
	log.Println("Connected to Redis")

	// Initialize S3/MinIO storage client
	storageClient, err := storage.New(storage.Config{
		Endpoint:     cfg.S3Endpoint,
		AccessKey:    cfg.S3AccessKey,
		SecretKey:    cfg.S3SecretKey,
		Bucket:       cfg.S3Bucket,
		Region:       cfg.S3Region,
		UsePathStyle: cfg.S3UsePathStyle,
	})
	if err != nil {
		log.Fatalf("Failed to initialize storage client: %v", err)
	}
	log.Println("Connected to S3/MinIO")

	// Start metrics server on port 9091
	metricsServer := metrics.StartMetricsServer("9091")

	// Start queue depth updater goroutine
	go metrics.StartQueueDepthUpdater(ctx, consumer.Client(), consumer.QueueKey(), 10*time.Second)

	// Handle shutdown signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("Shutdown signal received, stopping worker...")
		cancel()
		// Gracefully shutdown metrics server
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutdownCancel()
		metricsServer.Shutdown(shutdownCtx)
	}()

	// Main worker loop
	log.Println("Worker ready, waiting for jobs...")
	for {
		select {
		case <-ctx.Done():
			log.Println("Worker stopped")
			return
		default:
			// Try to get a job from the queue
			jobID, err := consumer.Pop(ctx)
			if err != nil {
				if ctx.Err() != nil {
					// Context cancelled, exit gracefully
					return
				}
				log.Printf("Error popping from queue: %v", err)
				continue
			}

			if jobID == "" {
				// No job available, continue polling
				continue
			}

			// Process the job with metrics
			metrics.IncrementActiveJobs()
			if err := processJob(ctx, queries, storageClient, jobID); err != nil {
				log.Printf("Error processing job %s: %v", jobID, err)
				metrics.RecordJobFailed()
			} else {
				metrics.RecordJobCompleted()
			}
			metrics.DecrementActiveJobs()
		}
	}
}

func processJob(ctx context.Context, queries *db.Queries, store *storage.Storage, jobIDStr string) error {
	log.Printf("Processing job: %s", jobIDStr)

	// Parse job ID
	jobUUID, err := uuid.Parse(jobIDStr)
	if err != nil {
		return fmt.Errorf("invalid job ID: %w", err)
	}

	pgUUID := pgtype.UUID{
		Bytes: jobUUID,
		Valid: true,
	}

	// Get job from database
	job, err := queries.GetJob(ctx, pgUUID)
	if err != nil {
		return fmt.Errorf("failed to get job: %w", err)
	}

	// Update status to processing
	_, err = queries.UpdateJobStatus(ctx, db.UpdateJobStatusParams{
		ID:           pgUUID,
		Status:       db.JobStatusProcessing,
		ErrorMessage: nil,
	})
	if err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	log.Printf("Job %s: status set to processing, input_key=%s", jobIDStr, job.InputKey)

	// Create temp directory for this job
	tempDir, err := os.MkdirTemp("", "transcode-"+jobIDStr)
	if err != nil {
		return markJobFailed(ctx, queries, pgUUID, fmt.Errorf("failed to create temp dir: %w", err))
	}
	defer os.RemoveAll(tempDir) // Clean up temp files

	// Get file extension from input key
	ext := filepath.Ext(job.InputKey)
	if ext == "" {
		ext = ".mp4" // Default extension
	}

	inputPath := filepath.Join(tempDir, "input"+ext)

	// Download input file from S3
	log.Printf("Job %s: downloading input file from %s", jobIDStr, job.InputKey)
	if err := store.Download(ctx, job.InputKey, inputPath); err != nil {
		return markJobFailed(ctx, queries, pgUUID, fmt.Errorf("failed to download input: %w", err))
	}
	log.Printf("Job %s: input file downloaded", jobIDStr)

	// Get renditions
	renditions, err := queries.GetRenditionsByJobID(ctx, pgUUID)
	if err != nil {
		return markJobFailed(ctx, queries, pgUUID, fmt.Errorf("failed to get renditions: %w", err))
	}

	// Extract base filename (without extension) from input key
	inputBase := filepath.Base(job.InputKey)
	inputName := strings.TrimSuffix(inputBase, filepath.Ext(inputBase))

	// Process each rendition using FFmpeg transcoding
	for _, r := range renditions {
		// Output is always .mp4 (H.264 + AAC)
		outputKey := fmt.Sprintf("outputs/%s/%s_%s.mp4", jobIDStr, inputName, r.Resolution)
		outputPath := filepath.Join(tempDir, inputName+"_"+r.Resolution+".mp4")

		log.Printf("Job %s: transcoding to %s", jobIDStr, r.Resolution)

		// Transcode using FFmpeg with timing
		transcodeStart := time.Now()
		if err := transcoder.Transcode(ctx, inputPath, outputPath, r.Resolution); err != nil {
			log.Printf("Job %s: failed to transcode rendition %s: %v", jobIDStr, r.Resolution, err)
			metrics.RecordTranscodeError(r.Resolution)
			continue
		}
		metrics.RecordJobDuration(r.Resolution, time.Since(transcodeStart))

		// Upload output to S3
		log.Printf("Job %s: uploading rendition %s to %s", jobIDStr, r.Resolution, outputKey)
		if err := store.Upload(ctx, outputPath, outputKey); err != nil {
			log.Printf("Job %s: failed to upload rendition %s: %v", jobIDStr, r.Resolution, err)
			continue
		}

		// Update rendition output key in database
		_, err := queries.UpdateRenditionOutputKey(ctx, db.UpdateRenditionOutputKeyParams{
			ID:        r.ID,
			OutputKey: &outputKey,
		})
		if err != nil {
			log.Printf("Job %s: failed to update rendition %s in DB: %v", jobIDStr, r.Resolution, err)
		}

		log.Printf("Job %s: rendition %s completed", jobIDStr, r.Resolution)
	}

	// Mark job as completed
	_, err = queries.UpdateJobStatus(ctx, db.UpdateJobStatusParams{
		ID:           pgUUID,
		Status:       db.JobStatusCompleted,
		ErrorMessage: nil,
	})
	if err != nil {
		return fmt.Errorf("failed to mark job as completed: %w", err)
	}

	log.Printf("Job %s: completed successfully", jobIDStr)
	return nil
}

// markJobFailed updates the job status to failed with an error message
func markJobFailed(ctx context.Context, queries *db.Queries, jobID pgtype.UUID, jobErr error) error {
	errMsg := jobErr.Error()
	_, err := queries.UpdateJobStatus(ctx, db.UpdateJobStatusParams{
		ID:           jobID,
		Status:       db.JobStatusFailed,
		ErrorMessage: &errMsg,
	})
	if err != nil {
		log.Printf("Failed to mark job as failed: %v", err)
	}
	return jobErr
}
