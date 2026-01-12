package queue

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const (
	// JobQueueKey is the Redis key for the pending jobs queue
	JobQueueKey = "jobs:pending"
	// DeadLetterQueueKey is the Redis key for failed jobs that exceeded max retries
	DeadLetterQueueKey = "jobs:dead"
	// LockKeyPrefix is the prefix for job lock keys
	LockKeyPrefix = "job:lock:"
	// DefaultLockTTL is the default time-to-live for job locks (5 minutes)
	DefaultLockTTL = 5 * time.Minute
)

// Consumer handles pulling jobs from the Redis queue
type Consumer struct {
	client   *redis.Client
	workerID string // Unique identifier for this worker instance
}

// NewConsumer creates a new queue consumer with a unique worker ID
func NewConsumer(redisAddr string) (*Consumer, error) {
	client := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	// Test connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	// Generate unique worker ID
	workerID := uuid.New().String()

	return &Consumer{
		client:   client,
		workerID: workerID,
	}, nil
}

// WorkerID returns this worker's unique identifier
func (c *Consumer) WorkerID() string {
	return c.workerID
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

// Lock attempts to acquire a distributed lock for a job.
// Returns true if the lock was acquired, false if another worker holds it.
// The lock expires after DefaultLockTTL to prevent deadlocks.
func (c *Consumer) Lock(ctx context.Context, jobID string) (bool, error) {
	lockKey := LockKeyPrefix + jobID
	// SET key value NX EX seconds - atomic set-if-not-exists with expiration
	result, err := c.client.SetNX(ctx, lockKey, c.workerID, DefaultLockTTL).Result()
	if err != nil {
		return false, fmt.Errorf("failed to acquire lock: %w", err)
	}
	return result, nil
}

// Unlock releases the distributed lock for a job.
// Only releases if this worker owns the lock (prevents releasing another worker's lock).
func (c *Consumer) Unlock(ctx context.Context, jobID string) error {
	lockKey := LockKeyPrefix + jobID

	// Lua script to atomically check owner and delete
	// This prevents race conditions where we check, then another worker acquires, then we delete
	script := redis.NewScript(`
		if redis.call("GET", KEYS[1]) == ARGV[1] then
			return redis.call("DEL", KEYS[1])
		else
			return 0
		end
	`)

	_, err := script.Run(ctx, c.client, []string{lockKey}, c.workerID).Result()
	if err != nil && err != redis.Nil {
		return fmt.Errorf("failed to release lock: %w", err)
	}
	return nil
}

// ExtendLock extends the TTL of a job lock.
// Used for long-running jobs to prevent lock expiration.
// Only extends if this worker owns the lock.
func (c *Consumer) ExtendLock(ctx context.Context, jobID string, ttl time.Duration) error {
	lockKey := LockKeyPrefix + jobID

	// Lua script to atomically check owner and extend TTL
	script := redis.NewScript(`
		if redis.call("GET", KEYS[1]) == ARGV[1] then
			return redis.call("PEXPIRE", KEYS[1], ARGV[2])
		else
			return 0
		end
	`)

	ttlMs := int64(ttl / time.Millisecond)
	result, err := script.Run(ctx, c.client, []string{lockKey}, c.workerID, ttlMs).Int64()
	if err != nil && err != redis.Nil {
		return fmt.Errorf("failed to extend lock: %w", err)
	}
	if result == 0 {
		return fmt.Errorf("lock not owned by this worker")
	}
	return nil
}

// Push adds a job ID back to the pending queue (for retries).
func (c *Consumer) Push(ctx context.Context, jobID string) error {
	return c.client.LPush(ctx, JobQueueKey, jobID).Err()
}

// PushDeadLetter moves a job to the dead letter queue.
// Jobs in this queue have exceeded max retries and need manual inspection.
func (c *Consumer) PushDeadLetter(ctx context.Context, jobID string) error {
	return c.client.LPush(ctx, DeadLetterQueueKey, jobID).Err()
}

// GetDeadLetterQueueLength returns the number of jobs in the dead letter queue.
func (c *Consumer) GetDeadLetterQueueLength(ctx context.Context) (int64, error) {
	return c.client.LLen(ctx, DeadLetterQueueKey).Result()
}
