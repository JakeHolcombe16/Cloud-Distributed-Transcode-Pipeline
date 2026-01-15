# Architecture Documentation

## Overview

The Cloud Distributed Transcode Pipeline is a microservices-based video transcoding system designed for horizontal scalability and production-grade observability. Built with Go, Kubernetes, and cloud-native patterns, it processes multiple concurrent video files across resolutions (480p-1080p) with automatic retry, distributed locking, and full observability.

## System Design

### Service Decomposition

The system is decomposed into four independently deployable services:

| Service | Port | Responsibility | Scaling |
|---------|------|----------------|---------|
| REST API | 8080 | Mutations (create jobs, presigned URLs) | 1 replica (I/O-bound) |
| GraphQL API | 8081 | Queries (list jobs, system metrics) | 1 replica (I/O-bound) |
| Worker | 9091 (metrics only) | Job processing (FFmpeg transcoding) | 1-10 replicas (CPU-bound, HPA) |
| Web (Frontend) | 3000 | Next.js UI with 3D pipeline visualization | 1 replica |

### Data Flow

```
1. Upload Flow:
   Browser -> REST API -> Presigned URL -> MinIO (direct upload)

2. Job Creation Flow:
   Browser -> REST API -> PostgreSQL (job record) -> Redis (queue) -> Response

3. Processing Flow:
   Worker -> Redis (BRPOP) -> PostgreSQL (status update) -> 
   MinIO (download) -> FFmpeg -> MinIO (upload) -> PostgreSQL (complete)

4. Query Flow:
   Browser -> GraphQL API -> PostgreSQL/Redis -> Response
```

## API Design

### REST vs GraphQL Separation

We deliberately separate read and write operations:

**REST API (Port 8080)** - Command/Mutation operations:
- `POST /jobs` - Create new transcoding job
- `GET /upload-url` - Get presigned S3 upload URL
- `GET /download-url/*` - Get presigned S3 download URL

**GraphQL API (Port 8081)** - Query operations:
- `jobs(limit, offset, status)` - List jobs with filtering
- `job(id)` - Get single job with renditions
- `systemMetrics` - Queue depth, job counts

### Why This Separation?

1. **Scalability**: Read traffic often exceeds write traffic 10:1. Separate services allow independent scaling.

2. **Caching**: GraphQL responses can be cached more aggressively than mutation endpoints.

3. **Complexity Isolation**: GraphQL resolver complexity doesn't affect mutation latency.

---

## Architecture Decisions

### Why Microservices Over Monolith?

**Problems with Monolith:**
- Can't scale independently (need 10 workers but only 1 API? Must scale entire app)
- Resource conflicts (CPU-heavy transcoding starves API response threads)
- Single point of failure (worker bug crashes entire app, API goes down)
- Deploy all-or-nothing (bug fix in worker requires redeploying API)

**Microservices Approach:**
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  API Service │  │ GraphQL Svc  │  │ Worker Svc   │
│  Port 8080   │  │ Port 8081    │  │ Port 9091    │
│  1 replica   │  │ 1 replica    │  │ 1-10 replicas│
│  I/O bound   │  │ I/O bound    │  │ CPU bound    │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Benefits:**
- **Independent Scaling**: Workers scale 1-10 based on CPU; API stays at 1 replica
- **Resource Optimization**: Workers get 2GB RAM + 2 CPUs; API gets 512MB RAM + 500m CPU
- **Fault Isolation**: Worker crash doesn't affect job creation
- **Independent Deployments**: Update worker without touching API
- **Technology Flexibility**: Could swap FFmpeg for AWS MediaConvert without changing API
- **Team Autonomy**: Different teams can own different services

**Real-World Example:**
- Scenario: Process 100 concurrent jobs but only 10 API requests/min
- Monolith: Must deploy 10 replicas (10x API + 10x GraphQL + 10x workers) = 20GB RAM, 20 CPUs
- Microservices: 1 API + 1 GraphQL + 10 workers = 2GB RAM, 12 CPUs (90% resource savings)

### Why Redis Queue Over Direct DB Polling?

**Problems with DB Polling:**
- **Database load**: 10 workers × 12 polls/min = 120 queries/min even when idle
- **Race conditions**: Two workers might grab same job simultaneously (complex locking needed)
- **Latency**: Job sits pending for 0-5 seconds until next poll
- **Wasted resources**: Workers constantly checking even when no jobs exist
- **Database bottleneck**: PostgreSQL becomes bottleneck at scale

**Redis Queue Approach:**

- **Zero idle CPU**: Workers block on BRPOP, Redis wakes them when jobs arrive
- **Atomic dequeue**: BRPOP atomically removes job (only one worker gets it)
- **Instant response**: Job processed immediately when added (<1ms latency)
- **Database efficiency**: No constant polling queries
- **Scalability**: Redis handles millions of operations/second

### Why Presigned URLs?

**Benefits:**
- **Performance**: Direct browser-to-S3 uploads bypass API (no proxying 100MB+ files)
- **Scalability**: API doesn't become a bandwidth bottleneck
- **Security**: Time-limited URLs (15-min expiration) with automatic validation
- **Cost efficiency**: 90%+ bandwidth reduction through API servers
- **Better UX**: Faster uploads (single network hop)

### Why Dual APIs (REST + GraphQL)?
**REST API (Port 8080)** - Optimized for mutations:
- `POST /jobs` - Create new transcoding job
- `GET /upload-url` - Get presigned S3 upload URL (simple, cacheable)
- `GET /download-url/*` - Get presigned S3 download URL

**GraphQL API (Port 8081)** - Flexible queries:
```graphql
# Client requests exactly what it needs
query {
  jobs(limit: 10, status: "completed") {
    id
    inputKey
    status
    renditions {  # Nested data in single request
      resolution
      outputKey
    }
  }
}
```

**Benefits:**
- **REST**: Simple, cacheable mutations (create job, presigned URLs)
- **GraphQL**: Flexible queries with client-driven field selection (reduces over-fetching)
- **Separation of Concerns**: Different services scale independently based on usage patterns
- **Caching**: GraphQL responses can be cached aggressively
- **Developer Experience**: Frontend developers can query exactly what they need

---

## Job Processing

### Queue Pattern: LPUSH/BRPOP

```
Producer (API)                    Consumer (Worker)
     │                                  │
     │ LPUSH jobs:pending jobId         │
     └──────────────────────────────────│
                                        │
                                        │ BRPOP jobs:pending 5s (blocking)
                                        │
                                        ▼
                                   Process Job
```

**How it works:**
- **LPUSH**: API adds job ID to left (head) of Redis list
- **BRPOP**: Worker removes job ID from right (tail) of Redis list (FIFO order)
- **Blocking**: Workers wait on BRPOP (no polling loop) until job is available
- **Timeout**: 5-second timeout allows graceful shutdown and context cancellation checks
- **At-least-once**: Jobs may be reprocessed on worker crash (idempotent design prevents duplicates)

### Distributed Locking

**Problem:** When a job is re-queued (e.g., after exponential backoff retry), multiple workers might try to process it simultaneously.

**Solution:** Redis-based distributed locks using `SET key value NX EX seconds`

**Lock Acquisition:**
```go
func (c *Consumer) Lock(ctx context.Context, jobID string) (bool, error) {
    lockKey := "lock:job:" + jobID

    // SET key value NX EX seconds
    // NX: Only set if key doesn't exist (atomic)
    // EX: Set expiration (prevents deadlocks)
    result, err := c.client.SetNX(ctx, lockKey, c.workerID, 5*time.Minute).Result()
    if err != nil {
        return false, err
    }

    return result, nil  // true = lock acquired, false = already locked
}
```

**Lock Release (Atomic with Lua Script):**
```go
func (c *Consumer) Unlock(ctx context.Context, jobID string) error {
    lockKey := "lock:job:" + jobID

    // Lua script ensures atomic check-and-delete
    // Only delete if current worker owns the lock
    script := redis.NewScript(`
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
        else
            return 0
        end
    `)

    _, err := script.Run(ctx, c.client, []string{lockKey}, c.workerID).Result()
    return err
}
```

**Lock Extension (For Long Jobs):**
```go
func (c *Consumer) ExtendLock(ctx context.Context, jobID string, extension time.Duration) error {
    lockKey := "lock:job:" + jobID

    // Lua script: only extend if current worker owns the lock
    script := redis.NewScript(`
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("EXPIRE", KEYS[1], ARGV[2])
        else
            return 0
        end
    `)

    _, err := script.Run(ctx, c.client, []string{lockKey}, c.workerID, int(extension.Seconds())).Result()
    return err
}
```

**Key Features:**
- **SetNX (Set if Not eXists)**: Atomic lock acquisition (only one worker succeeds)
- **TTL (5 minutes)**: Lock expires automatically if worker crashes (prevents deadlocks)
- **Worker ID**: Each worker has unique UUID to prove ownership
- **Lock Extension**: Long-running jobs extend locks to prevent expiration

### Exponential Backoff Retry Strategy

**Problem:** Transient errors (network timeout, temporary S3 unavailability) shouldn't permanently fail jobs.

**Solution:** Retry with exponentially increasing delays (10s -> 30s -> 60s)

**Database Schema:**
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    -- ... other fields
);
```

**Retry Logic:**
```go
var retryDelays = []time.Duration{
    10 * time.Second,  // First retry: 10s
    30 * time.Second,  // Second retry: 30s
    60 * time.Second,  // Third retry: 60s
}

func handleJobFailure(ctx context.Context, queries *db.Queries, consumer *queue.Consumer, jobID string, jobErr error) {
    job, _ := queries.GetJob(ctx, jobID)

    if job.RetryCount >= job.MaxRetries {
        // Exhausted retries -> Dead Letter Queue
        log.Printf("Job %s exceeded max retries (%d), moving to DLQ", jobID, job.MaxRetries)
        consumer.PushDeadLetter(ctx, jobID)

        queries.UpdateJobStatus(ctx, db.UpdateJobStatusParams{
            ID:           jobID,
            Status:       "failed",
            ErrorMessage: "exceeded max retries: " + jobErr.Error(),
        })
        return
    }

    // Increment retry count
    queries.IncrementRetryCount(ctx, jobID)

    // Schedule retry with exponential backoff
    delay := retryDelays[job.RetryCount]
    log.Printf("Job %s failed (attempt %d/%d), retrying in %v", jobID, job.RetryCount+1, job.MaxRetries, delay)

    time.Sleep(delay)
    consumer.Push(ctx, jobID)  // Re-queue job
}
```

**Benefits:**
- **Transient errors**: Network timeouts, temporary S3 outages automatically recover
- **Progressive backoff**: Gives system time to recover (10s -> 30s -> 60s)
- **Configurable**: `max_retries` per job (default 3)
- **Observability**: Retry count tracked in database and metrics

### Dead Letter Queue (DLQ)

**Problem:** Jobs that fail permanently (corrupt video, unsupported format, missing file) should be isolated for manual inspection instead of retrying forever.

**Solution:** Separate Redis list (`jobs:dead`) for jobs that exceeded `max_retries`.

**Implementation:**
```go
const DeadLetterQueueKey = "jobs:dead"

func (c *Consumer) PushDeadLetter(ctx context.Context, jobID string) error {
    return c.client.LPush(ctx, DeadLetterQueueKey, jobID).Err()
}

func (c *Consumer) GetDeadLetterQueue(ctx context.Context) ([]string, error) {
    return c.client.LRange(ctx, DeadLetterQueueKey, 0, -1).Result()
}
```

**When Jobs Move to DLQ:**
1. **Exceeded max retries**: Job failed 3 times (default), likely permanent issue
2. **Status marked "failed"**: Database updated with error message
3. **Isolated for inspection**: Manual review to determine root cause

**Benefits:**
- **Prevents infinite retries**: Jobs don't loop forever consuming resources
- **Isolates corruption**: Corrupt files don't block other jobs
- **Manual inspection**: Devs can analyze why job failed
- **Metrics/Alerting**: Monitor DLQ depth (`redis.LLen("jobs:dead")`)
- **Re-queue option**: Fixed jobs can be manually moved back to `jobs:pending`

**Handling Dead Letter Jobs:**

**View DLQ via Redis CLI:**
```bash
# List all dead letter jobs
redis-cli LRANGE jobs:dead 0 -1

# Get count
redis-cli LLEN jobs:dead
```

**View DLQ via Database:**
```sql
-- Find all failed jobs
SELECT id, input_key, error_message, retry_count, updated_at
FROM jobs
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

**Re-queue Fixed Job:**
```bash
# After fixing underlying issue (e.g., corrupt file replaced)
redis-cli LREM jobs:dead 1 "job-uuid-123"
redis-cli LPUSH jobs:pending "job-uuid-123"

# Reset retry count in database
UPDATE jobs SET retry_count = 0, status = 'queued' WHERE id = 'job-uuid-123';
```

**Common Failure Reasons:**
- **Transient (retry succeeds)**: Network timeout, S3 temporary unavailability, worker OOM
- **Permanent (moves to DLQ)**: Corrupt video file, unsupported codec, missing input file, invalid resolution

### Idempotent Workers

**Problem:** Workers might crash mid-job or process the same job twice (after retry). This must not create duplicate outputs or corrupted data.

**Solution:** Design all operations to be **idempotent** (same result regardless of how many times executed).

**Idempotent Database Updates:**
```go
// Sets to absolute value (idempotent)
queries.UpdateJobStatus(ctx, db.UpdateJobStatusParams{
    ID:     jobID,
    Status: "processing",  // Same final state regardless of retries
})

queries.CompleteRendition(ctx, db.CompleteRenditionParams{
    JobID:      jobID,
    Resolution: "480p",
    OutputKey:  "outputs/job123/480p.mp4",  // Same value every time
})

```

**Idempotent S3 Uploads:**
```go
// Deterministic S3 key (overwrites previous attempt)
outputKey := fmt.Sprintf("outputs/%s/%s.mp4", jobID, resolution)
s3Client.Upload(bucket, outputKey, videoData)
// Retry uploads to same key -> same final state (overwrites partial upload)
```

**Idempotent Check (Skip Already-Completed Work):**
```go
func processJob(jobID string, resolution string) error {
    // Check if output already exists (worker crashed after upload but before DB update)
    outputKey := fmt.Sprintf("outputs/%s/%s.mp4", jobID, resolution)
    exists, _ := s3Client.ObjectExists(bucket, outputKey)

    if exists {
        log.Printf("Output %s already exists, skipping transcode", outputKey)
        // Still update DB to mark as complete (DB update is idempotent)
        queries.CompleteRendition(ctx, db.CompleteRenditionParams{
            JobID:      jobID,
            Resolution: resolution,
            OutputKey:  outputKey,
        })
        return nil
    }

    // Proceed with transcoding
    transcode(input, output, resolution)
    s3Client.Upload(bucket, outputKey, output)
    queries.CompleteRendition(ctx, ...)
}
```

**Benefits:**
- **Crash recovery**: Worker crashes mid-job -> another worker safely re-processes
- **No duplicates**: Retry doesn't create duplicate S3 files or database entries
- **Data consistency**: Final state is identical whether job ran once or ten times
- **Safe retries**: Exponential backoff can safely re-queue jobs

### Transcoding Pipeline

For each job, the worker:

1. Downloads input from S3/MinIO
2. Creates multiple renditions (480p, 720p, 1080p)
3. Uploads each rendition to S3/MinIO
4. Updates database with output keys

```go
// Parallel rendition processing (future enhancement)
// Current: sequential for simplicity
for _, resolution := range ["480p", "720p", "1080p"] {
    transcode(input, output, resolution)
    upload(output, s3Key)
}
```

## Observability Stack

### Prometheus Metrics

All services expose `/metrics` endpoints with the following:

**REST API Metrics:**
```
http_requests_total{method, endpoint, status}  # Counter
http_request_duration_seconds{method, endpoint} # Histogram
jobs_created_total                              # Counter
active_connections                              # Gauge
```

**Worker Metrics:**
```
jobs_processed_total{status}       # Counter (completed/failed)
job_duration_seconds{resolution}   # Histogram
transcode_errors_total{resolution} # Counter
queue_depth                        # Gauge
active_jobs                        # Gauge
```

**GraphQL API Metrics:**
```
graphql_requests_total{operation, status}     # Counter
graphql_request_duration_seconds{operation}   # Histogram
http_requests_total{method, endpoint, status} # Counter
```

### Grafana Dashboards

Pre-configured dashboard (`deploy/grafana/provisioning/dashboards/transcode-pipeline.json`) includes:

- **Overview Row**: Total jobs, completed jobs, queue depth, active jobs
- **Traffic Row**: API request rate, job processing rate
- **Performance Row**: Transcode duration by resolution, API latency
- **Health Row**: Queue & active jobs trend, error rates

### Key Observability Patterns

1. **RED Method** (Rate, Errors, Duration):
   - Rate: `rate(http_requests_total[5m])`
   - Errors: `rate(http_requests_total{status=~"5.."}[5m])`
   - Duration: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`

2. **USE Method** for workers:
   - Utilization: `active_jobs / max_workers`
   - Saturation: `queue_depth`
   - Errors: `rate(transcode_errors_total[5m])`

## Database Schema

```sql
-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    input_key TEXT NOT NULL,
    status job_status NOT NULL,  -- queued, processing, completed, failed
    error_message TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Renditions table (one-to-many with jobs)
CREATE TABLE renditions (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES jobs(id),
    resolution TEXT NOT NULL,     -- 480p, 720p, 1080p
    output_key TEXT,              -- S3 key when complete
    UNIQUE(job_id, resolution)
);
```

---

## Deployment Architecture

### Kubernetes Service Discovery

**Problem:** Services need to communicate without hardcoded IP addresses (pods restart with new IPs).

**Solution:** Kubernetes DNS automatically creates DNS entries for all Services.

**ConfigMap (deploy/k8s/configmap.yaml):**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: transcode-config
  namespace: transcode
data:
  REDIS_ADDR: "redis:6379"              # ← DNS name, not IP
  S3_ENDPOINT: "http://minio:9000"      # ← DNS name, not IP
```

**Worker Deployment (deploy/k8s/worker/deployment.yaml):**
```yaml
env:
  - name: REDIS_ADDR
    valueFrom:
      configMapKeyRef:
        name: transcode-config
        key: REDIS_ADDR  # Gets "redis:6379"
```

**How it works:**
1. Worker pod reads env var: `REDIS_ADDR=redis:6379`
2. Worker code connects to `redis:6379`
3. **Kubernetes DNS** resolves `redis` -> current IP of Redis pod (e.g., `10.244.0.15`)
4. Connection succeeds!

**DNS Entries Created Automatically:**

| Service Name | DNS Entry | Resolves To (Example) |
|-------------|-----------|----------------------|
| `redis` | `redis.transcode.svc.cluster.local` | `10.244.0.15:6379` |
| `postgres` | `postgres.transcode.svc.cluster.local` | `10.244.0.12:5432` |
| `minio` | `minio.transcode.svc.cluster.local` | `10.244.0.18:9000` |
| `api` | `api.transcode.svc.cluster.local` | `10.244.0.25:8080` |
| `graphql` | `graphql.transcode.svc.cluster.local` | `10.244.0.30:8081` |

**Benefits:**
- **Zero configuration changes when scaling**: Add 10 workers, no code updates needed
- **Automatic failover**: Pod dies -> Kubernetes updates DNS within seconds
- **Service abstraction**: Code uses logical names (`redis`), not physical IPs
- **Environment parity**: Same DNS names work across dev/staging/prod clusters

**Prometheus Service Discovery:**

Prometheus uses Kubernetes API to automatically discover all pods:

```yaml
# deploy/k8s/monitoring/prometheus.yaml
kubernetes_sd_configs:
  - role: pod  # ← Automatically discovers all pods
    namespaces:
      names:
        - transcode

# Filters pods with annotation prometheus.io/scrape=true
relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
```

**What happens:**
1. Prometheus queries Kubernetes API: "Give me all pods in `transcode` namespace"
2. Kubernetes returns list with IPs: `worker-abc123 -> 10.244.0.50:9091`, `api-xyz789 -> 10.244.0.25:8080`
3. Prometheus scrapes metrics from each IP
4. **When you scale workers**, Prometheus automatically discovers new pods within 30 seconds!

### Docker Compose (Development)

```yaml
services:
  - postgres     # Database
  - redis        # Queue
  - minio        # S3-compatible storage
  - api          # REST API
  - graphql      # GraphQL API
  - worker       # Job processor (scale with: docker-compose up -d --scale worker=5)
  - web          # Next.js frontend
  - prometheus   # Metrics collection
  - grafana      # Dashboards
```

**Benefits:**
- **Fast iteration**: Single command (`docker-compose up -d`) starts entire stack
- **Manual scaling**: `docker-compose up -d --scale worker=5` for testing load
- **No Kubernetes required**: Runs on laptop with Docker Desktop

### Kubernetes (Production)

```
┌─────────────────────────────────────────────────────┐
│                   Ingress Controller                │
└──────────────┬─────────────────────┬───────────────┘
               │                     │
        ┌──────▼──────┐       ┌──────▼──────┐
        │ API Service │       │ GQL Service │
        │  (ClusterIP)│       │  (ClusterIP)│
        └──────┬──────┘       └──────┬──────┘
               │                     │
        ┌──────▼──────┐       ┌──────▼──────┐
        │   API Pods  │       │   GQL Pods  │
        │ (Deployment)│       │ (Deployment)│
        └─────────────┘       └─────────────┘

┌─────────────────────────────────────────────────────┐
│                Worker Deployment                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │Worker 1 │ │Worker 2 │ │Worker 3 │ │Worker N │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                      │
│  HPA: Scale based on queue_depth metric              │
└─────────────────────────────────────────────────────┘
```

---

## Security Considerations

### Implemented Security Features

1. **Presigned URLs**:
   - Files never pass through API servers (direct browser-to-S3 upload)
   - Time-limited URLs (15-minute expiration)
   - Automatic validation by S3/MinIO
   - Prevents API from becoming bandwidth bottleneck

2. **Internal Services**:
   - Workers and databases don't need external exposure
   - Only API, GraphQL, and Web exposed via LoadBalancer/Ingress
   - Kubernetes NetworkPolicies can further restrict inter-pod communication

3. **Distributed Locking**:
   - Prevents race conditions and duplicate processing
   - Each worker has unique UUID for ownership verification
   - Lua scripts ensure atomic lock operations

4. **Resource Limits**:
   - CPU and memory limits on all pods prevent resource exhaustion
   - OOMKiller protects cluster from runaway processes
   - HPA prevents infinite scaling (maxReplicas: 10)


---

## Cloud-Native Patterns Summary

### Scalability Patterns

1. **Horizontal Pod Autoscaling (HPA)**:
   - Workers scale 1-10 replicas based on CPU utilization (70% threshold)
   - Automatically handles variable load without manual intervention
   - Kubernetes deployment: `deploy/k8s/worker/hpa.yaml`

2. **Stateless Services**:
   - All services can scale horizontally (no local state)
   - Session state stored in Redis/PostgreSQL (shared across replicas)
   - Workers can be killed and restarted without data loss

3. **Service Discovery**:
   - Kubernetes DNS resolves service names to pod IPs
   - No hardcoded IP addresses (pods restart with new IPs)
   - Automatic failover when pods die

### Reliability Patterns

4. **Distributed Locking**:
   - Redis SetNX (Set if Not eXists) for atomic lock acquisition
   - Prevents race conditions when jobs re-queued after retry
   - Lua scripts ensure atomic check-and-delete operations

5. **Exponential Backoff Retry**:
   - Progressive retry delays (10s -> 30s -> 60s)
   - Handles transient failures (network timeouts, temporary outages)
   - Configurable max_retries per job (default 3)

6. **Dead Letter Queue**:
   - Separate Redis list for permanently failed jobs
   - Prevents infinite retry loops 
   - Manual inspection and re-queue capability

7. **Idempotent Operations**:
   - Same job can be processed multiple times -> same final state
   - Deterministic S3 keys (no timestamps)
   - Database updates set absolute values (no increments)

8. **Health Checks**:
   - Kubernetes readinessProbe (is service ready for traffic?)
   - Kubernetes livenessProbe (is service healthy? restart if not)
   - Graceful shutdown (30-second timeout for in-flight requests)

### Performance Patterns

9. **Producer-Consumer Queue**:
   - Redis LPUSH/BRPOP for job distribution
   - Zero idle CPU (blocking wait instead of polling)
   - Atomic dequeue (no race conditions)

10. **Presigned URLs**:
    - Direct browser-to-S3 uploads bypass API
    - 90%+ bandwidth reduction through API servers
    - API doesn't become bottleneck for large files

11. **CQRS (Command Query Responsibility Segregation)**:
    - REST API for mutations (create jobs, presigned URLs)
    - GraphQL API for queries (flexible field selection)
    - Services scale independently based on usage patterns

### Observability Patterns

12. **RED Method** (Rate, Errors, Duration):
    - `rate(http_requests_total[5m])` - Request rate
    - `rate(http_requests_total{status=~"5.."}[5m])` - Error rate
    - `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` - P95 latency

13. **USE Method** (Utilization, Saturation, Errors):
    - Utilization: `active_jobs / max_workers`
    - Saturation: `queue_depth`
    - Errors: `rate(transcode_errors_total[5m])`

14. **Prometheus Service Discovery**:
    - Kubernetes API integration automatically discovers pods
    - No manual configuration when scaling workers
    - Scrapes metrics from all replicas

15. **Grafana Dashboards**:
    - Pre-configured dashboard with job throughput, queue depth, latency
    - Real-time monitoring of system health
    - Demonstrates production-ready observability

### Deployment Patterns

16. **Infrastructure as Code**:
    - All Kubernetes resources defined in YAML (deploy/k8s/)
    - Declarative configuration (desired state vs imperative commands)
    - Version controlled (Git tracks all infrastructure changes)

17. **Multi-stage Docker Builds**:
    - Separate build and runtime layers
    - Smaller final images (no build tools in production)
    - Example: Next.js app (build stage -> production stage)

18. **Resource Limits**:
    - CPU and memory requests/limits on all pods
    - Prevents resource exhaustion and noisy neighbors
    - Kubernetes scheduler uses requests for placement

19. **Graceful Shutdown**:
    - Services listen for SIGTERM signal
    - 30-second timeout to complete in-flight requests
    - Workers finish current job before exiting


---

