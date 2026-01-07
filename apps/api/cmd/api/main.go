package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/api/internal/config"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/api/internal/db"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/api/internal/handler"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/api/internal/queue"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/api/internal/storage"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to PostgreSQL
	ctx := context.Background()
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
	producer, err := queue.NewProducer(cfg.RedisAddr)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer producer.Close()
	log.Println("Connected to Redis")

	// Initialize S3/MinIO storage client
	storageClient, err := storage.New(storage.Config{
		Endpoint:       cfg.S3Endpoint,
		PublicEndpoint: cfg.S3PublicEndpoint,
		AccessKey:      cfg.S3AccessKey,
		SecretKey:      cfg.S3SecretKey,
		Bucket:         cfg.S3Bucket,
		Region:         cfg.S3Region,
		UsePathStyle:   cfg.S3UsePathStyle,
	})
	if err != nil {
		log.Fatalf("Failed to initialize storage client: %v", err)
	}
	log.Println("Connected to S3/MinIO")

	// Initialize handlers
	jobHandler := handler.NewJobHandler(queries, producer)
	storageHandler := handler.NewStorageHandler(storageClient)

	// Set up router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(corsMiddleware)

	// Rate limiting: 100 requests per minute per IP
	r.Use(httprate.LimitByIP(100, 1*time.Minute))

	// Limit request body size to 10MB (for video metadata)
	r.Use(middleware.RequestSize(10 * 1024 * 1024))

	// Routes
	r.Get("/health", handler.Health)

	// Storage routes (presigned URLs)
	r.Get("/upload-url", storageHandler.GetUploadURL)
	r.Get("/download-url/*", storageHandler.GetDownloadURL)

	r.Route("/jobs", func(r chi.Router) {
		r.Post("/", jobHandler.CreateJob)
		r.Get("/", jobHandler.ListJobs)
		r.Get("/{id}", jobHandler.GetJob)
	})

	// Create server
	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("API server starting on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped")
}

// corsMiddleware adds CORS headers for frontend access
func corsMiddleware(next http.Handler) http.Handler {
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
