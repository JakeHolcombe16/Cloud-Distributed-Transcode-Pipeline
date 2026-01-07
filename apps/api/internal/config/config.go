package config

import (
	"fmt"
	"os"
)

// Config holds all configuration for the API service
type Config struct {
	Port             string
	DatabaseURL      string
	RedisAddr        string
	S3Endpoint       string
	S3PublicEndpoint string
	S3AccessKey      string
	S3SecretKey      string
	S3Bucket         string
	S3Region         string
	S3UsePathStyle   bool
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	s3Endpoint := getEnv("S3_ENDPOINT", "http://localhost:9000")
	cfg := &Config{
		Port:             getEnv("PORT", "8080"),
		DatabaseURL:      getEnv("DATABASE_URL", ""),
		RedisAddr:        getEnv("REDIS_ADDR", "localhost:6379"),
		S3Endpoint:       s3Endpoint,
		S3PublicEndpoint: getEnv("S3_PUBLIC_ENDPOINT", s3Endpoint), // Defaults to S3_ENDPOINT
		S3AccessKey:      getEnv("S3_ACCESS_KEY", "minioadmin"),
		S3SecretKey:      getEnv("S3_SECRET_KEY", "minioadmin"),
		S3Bucket:         getEnv("S3_BUCKET", "transcode"),
		S3Region:         getEnv("S3_REGION", "us-east-1"),
		S3UsePathStyle:   getEnv("S3_USE_PATH_STYLE", "true") == "true",
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
