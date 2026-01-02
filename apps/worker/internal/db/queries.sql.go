// versions:
//   sqlc v1.30.0
// source: queries.sql

package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const getJob = `-- name: GetJob :one
SELECT id, input_key, status, error_message, created_at, updated_at FROM jobs
WHERE id = $1
`

func (q *Queries) GetJob(ctx context.Context, id pgtype.UUID) (Job, error) {
	row := q.db.QueryRow(ctx, getJob, id)
	var i Job
	err := row.Scan(
		&i.ID,
		&i.InputKey,
		&i.Status,
		&i.ErrorMessage,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getRenditionsByJobID = `-- name: GetRenditionsByJobID :many
SELECT id, job_id, resolution, output_key, created_at FROM renditions
WHERE job_id = $1
ORDER BY resolution
`

func (q *Queries) GetRenditionsByJobID(ctx context.Context, jobID pgtype.UUID) ([]Rendition, error) {
	rows, err := q.db.Query(ctx, getRenditionsByJobID, jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Rendition{}
	for rows.Next() {
		var i Rendition
		if err := rows.Scan(
			&i.ID,
			&i.JobID,
			&i.Resolution,
			&i.OutputKey,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateJobStatus = `-- name: UpdateJobStatus :one
UPDATE jobs
SET status = $2, error_message = $3
WHERE id = $1
RETURNING id, input_key, status, error_message, created_at, updated_at
`

type UpdateJobStatusParams struct {
	ID           pgtype.UUID `json:"id"`
	Status       JobStatus   `json:"status"`
	ErrorMessage *string     `json:"error_message"`
}

func (q *Queries) UpdateJobStatus(ctx context.Context, arg UpdateJobStatusParams) (Job, error) {
	row := q.db.QueryRow(ctx, updateJobStatus, arg.ID, arg.Status, arg.ErrorMessage)
	var i Job
	err := row.Scan(
		&i.ID,
		&i.InputKey,
		&i.Status,
		&i.ErrorMessage,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const updateRenditionOutputKey = `-- name: UpdateRenditionOutputKey :one
UPDATE renditions
SET output_key = $2
WHERE id = $1
RETURNING id, job_id, resolution, output_key, created_at
`

type UpdateRenditionOutputKeyParams struct {
	ID        pgtype.UUID `json:"id"`
	OutputKey *string     `json:"output_key"`
}

func (q *Queries) UpdateRenditionOutputKey(ctx context.Context, arg UpdateRenditionOutputKeyParams) (Rendition, error) {
	row := q.db.QueryRow(ctx, updateRenditionOutputKey, arg.ID, arg.OutputKey)
	var i Rendition
	err := row.Scan(
		&i.ID,
		&i.JobID,
		&i.Resolution,
		&i.OutputKey,
		&i.CreatedAt,
	)
	return i, err
}
