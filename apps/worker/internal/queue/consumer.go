package queue

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	// JobQueueKey is the Redis key for the pending jobs queue
	JobQueueKey = "jobs:pending"
)

// Consumer handles pulling jobs from the Redis queue
type Consumer struct {
	client *redis.Client
}

// NewConsumer creates a new queue consumer
func NewConsumer(redisAddr string) (*Consumer, error) {
	client := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	// Test connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &Consumer{client: client}, nil
}

// Pop blocks until a job is available and returns the job ID
// Returns empty string and context error if context is cancelled
func (c *Consumer) Pop(ctx context.Context) (string, error) {
	// BRPOP blocks until an element is available
	// Timeout of 0 means block indefinitely (but still respects context)
	// We use a shorter timeout to allow checking context cancellation
	result, err := c.client.BRPop(ctx, 5*time.Second, JobQueueKey).Result()
	if err != nil {
		if err == redis.Nil {
			// Timeout, no job available - this is normal
			return "", nil
		}
		return "", err
	}

	// result[0] is the key name, result[1] is the value (job ID)
	if len(result) < 2 {
		return "", fmt.Errorf("unexpected BRPOP result: %v", result)
	}

	return result[1], nil
}

// Close closes the Redis connection
func (c *Consumer) Close() error {
	return c.client.Close()
}

// Client returns the underlying Redis client for metrics collection
func (c *Consumer) Client() *redis.Client {
	return c.client
}

// QueueKey returns the queue key used by this consumer
func (c *Consumer) QueueKey() string {
	return JobQueueKey
}
