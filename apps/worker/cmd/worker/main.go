package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/worker/internal/config"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/worker/internal/db"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/worker/internal/queue"
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

	// Handle shutdown signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("Shutdown signal received, stopping worker...")
		cancel()
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

			// Process the job
			if err := processJob(ctx, queries, cfg, jobID); err != nil {
				log.Printf("Error processing job %s: %v", jobID, err)
			}
		}
	}
}

func processJob(ctx context.Context, queries *db.Queries, cfg *config.Config, jobIDStr string) error {
	log.Printf("Processing job: %s", jobIDStr)

	// Parse job ID
	jobUUID, err := uuid.Parse(jobIDStr)
	if err != nil {
		return err
	}

	pgUUID := pgtype.UUID{
		Bytes: jobUUID,
		Valid: true,
	}

	// Get job from database
	job, err := queries.GetJob(ctx, pgUUID)
	if err != nil {
		return err
	}

	// Update status to processing
	_, err = queries.UpdateJobStatus(ctx, db.UpdateJobStatusParams{
		ID:           pgUUID,
		Status:       db.JobStatusProcessing,
		ErrorMessage: nil,
	})
	if err != nil {
		return err
	}

	log.Printf("Job %s: status set to processing, input_key=%s", jobIDStr, job.InputKey)

	// TODO:
	// 1. Download the input file from S3/MinIO
	// 2. Run FFmpeg to transcode
	// 3. Upload the output files back to S3/MinIO
	// 4. Update rendition output_keys

	// For now, just simulate processing and mark as completed
	log.Printf("Job %s: simulating processing", jobIDStr)

	// Get renditions and update their output keys (simulated)
	renditions, err := queries.GetRenditionsByJobID(ctx, pgUUID)
	if err != nil {
		log.Printf("Warning: failed to get renditions for job %s: %v", jobIDStr, err)
	}

	for _, r := range renditions {
		// Simulate setting output key
		outputKey := "outputs/" + jobIDStr + "/" + r.Resolution + ".mp4"
		_, err := queries.UpdateRenditionOutputKey(ctx, db.UpdateRenditionOutputKeyParams{
			ID:        r.ID,
			OutputKey: &outputKey,
		})
		if err != nil {
			log.Printf("Warning: failed to update rendition %s: %v", r.Resolution, err)
		}
	}

	// Mark job as completed
	_, err = queries.UpdateJobStatus(ctx, db.UpdateJobStatusParams{
		ID:           pgUUID,
		Status:       db.JobStatusCompleted,
		ErrorMessage: nil,
	})
	if err != nil {
		return err
	}

	log.Printf("Job %s: completed successfully", jobIDStr)
	return nil
}

