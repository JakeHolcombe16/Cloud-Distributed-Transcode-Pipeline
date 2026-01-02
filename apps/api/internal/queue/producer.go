package queue

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

const (
	// JobQueueKey is the Redis key for the pending jobs queue
	JobQueueKey = "jobs:pending"
)

// Producer handles pushing jobs to the Redis queue
type Producer struct {
	client *redis.Client
}

// NewProducer creates a new queue producer
func NewProducer(redisAddr string) (*Producer, error) {
	client := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	// Test connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &Producer{client: client}, nil
}

// Push adds a job ID to the queue
func (p *Producer) Push(ctx context.Context, jobID string) error {
	// LPUSH adds to the left (head) of the list
	// Workers use BRPOP to pop from the right (tail) - FIFO order
	return p.client.LPush(ctx, JobQueueKey, jobID).Err()
}

// QueueLength returns the current number of jobs in the queue
func (p *Producer) QueueLength(ctx context.Context) (int64, error) {
	return p.client.LLen(ctx, JobQueueKey).Result()
}

// Close closes the Redis connection
func (p *Producer) Close() error {
	return p.client.Close()
}

