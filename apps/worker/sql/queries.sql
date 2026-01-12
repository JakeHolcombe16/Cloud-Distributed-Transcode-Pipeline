-- name: GetJob :one
SELECT * FROM jobs
WHERE id = $1;

-- name: UpdateJobStatus :one
UPDATE jobs
SET status = $2, error_message = $3
WHERE id = $1
RETURNING *;

-- name: GetRenditionsByJobID :many
SELECT * FROM renditions
WHERE job_id = $1
ORDER BY resolution;

-- name: UpdateRenditionOutputKey :one
UPDATE renditions
SET output_key = $2
WHERE id = $1
RETURNING *;

-- name: StartJobProcessing :one
-- Atomically claim a job for processing by setting worker_id and started_at
UPDATE jobs
SET status = 'processing',
    worker_id = $2,
    started_at = NOW(),
    error_message = NULL
WHERE id = $1 AND (status = 'queued' OR (status = 'processing' AND started_at < NOW() - INTERVAL '10 minutes'))
RETURNING *;

-- name: IncrementRetryCount :one
-- Increment retry count and reset status to queued for retry
UPDATE jobs
SET status = 'queued',
    retry_count = retry_count + 1,
    worker_id = NULL,
    started_at = NULL
WHERE id = $1
RETURNING *;

-- name: GetStaleJobs :many
-- Find jobs that have been processing for too long (stuck workers)
SELECT * FROM jobs
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '10 minutes'
LIMIT 100;

-- name: ResetStalledJob :one
-- Reset a stalled job back to queued status
UPDATE jobs
SET status = 'queued',
    worker_id = NULL,
    started_at = NULL
WHERE id = $1 AND status = 'processing'
RETURNING *;

