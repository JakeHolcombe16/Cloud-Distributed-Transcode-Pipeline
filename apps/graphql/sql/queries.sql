-- GraphQL service queries (read-only)

-- name: GetJob :one
SELECT * FROM jobs
WHERE id = $1;

-- name: ListJobs :many
SELECT * FROM jobs
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListJobsByStatus :many
SELECT * FROM jobs
WHERE status = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetRenditionsByJobID :many
SELECT * FROM renditions
WHERE job_id = $1
ORDER BY resolution;

-- name: CountJobsByStatus :one
SELECT 
    COUNT(*) FILTER (WHERE status = 'queued') AS queued,
    COUNT(*) FILTER (WHERE status = 'processing') AS processing,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed,
    COUNT(*) AS total
FROM jobs;
