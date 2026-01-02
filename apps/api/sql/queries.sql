-- name: CreateJob :one
INSERT INTO jobs (input_key, status)
VALUES ($1, 'queued')
RETURNING *;

-- name: GetJob :one
SELECT * FROM jobs
WHERE id = $1;

-- name: UpdateJobStatus :one
UPDATE jobs
SET status = $2, error_message = $3
WHERE id = $1
RETURNING *;

-- name: ListJobs :many
SELECT * FROM jobs
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListJobsByStatus :many
SELECT * FROM jobs
WHERE status = $1
ORDER BY created_at DESC;

-- name: CreateRendition :one
INSERT INTO renditions (job_id, resolution)
VALUES ($1, $2)
RETURNING *;

-- name: UpdateRenditionOutputKey :one
UPDATE renditions
SET output_key = $2
WHERE id = $1
RETURNING *;

-- name: GetRenditionsByJobID :many
SELECT * FROM renditions
WHERE job_id = $1
ORDER BY resolution;

-- name: GetRendition :one
SELECT * FROM renditions
WHERE id = $1;

