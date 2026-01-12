-- Cloud Distributed Transcode Pipeline
-- Database Schema (read by sqlc for type generation)

-- Job status enum
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed');

-- Jobs table: tracks each transcode request
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    input_key TEXT NOT NULL,              -- S3 key for uploaded file (e.g., "uploads/{id}/input.mp4")
    status job_status NOT NULL DEFAULT 'queued',
    error_message TEXT,                   -- Error details if status = 'failed'
    retry_count INT NOT NULL DEFAULT 0,   -- Number of retry attempts so far
    max_retries INT NOT NULL DEFAULT 3,   -- Maximum retry attempts before moving to dead letter
    started_at TIMESTAMPTZ,               -- When processing started (for timeout detection)
    worker_id TEXT,                       -- ID of worker currently processing this job
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Renditions table: tracks each output resolution for a job
CREATE TABLE renditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resolution TEXT NOT NULL,             -- e.g., "480p", "720p", "1080p"
    output_key TEXT,                      -- S3 key for output file (NULL until completed)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(job_id, resolution)            -- One rendition per resolution per job
);

-- Index for faster job lookups by status (useful for worker queries)
CREATE INDEX idx_jobs_status ON jobs(status);

-- Index for faster rendition lookups by job
CREATE INDEX idx_renditions_job_id ON renditions(job_id);
