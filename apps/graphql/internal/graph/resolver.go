package graph

import (
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/graphql/internal/db"
	"github.com/redis/go-redis/v9"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require
// here.

// Resolver is the root resolver for GraphQL queries
type Resolver struct {
	DB          *db.Queries
	RedisClient *redis.Client
}

// NewResolver creates a new resolver with dependencies
func NewResolver(queries *db.Queries, redisClient *redis.Client) *Resolver {
	return &Resolver{
		DB:          queries,
		RedisClient: redisClient,
	}
}
