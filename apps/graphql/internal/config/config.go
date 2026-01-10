package config

import (
	"fmt"
	"os"
)

// Config holds the GraphQL service configuration
type Config struct {
	Port        string
	DatabaseURL string
	RedisAddr   string
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		Port:        getEnv("PORT", "8081"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		RedisAddr:   getEnv("REDIS_ADDR", "localhost:6379"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
