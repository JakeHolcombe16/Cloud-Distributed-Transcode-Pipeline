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

