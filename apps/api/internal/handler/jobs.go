package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/api/internal/db"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/api/internal/metrics"
	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/api/internal/queue"
)

// JobHandler handles job-related HTTP requests
type JobHandler struct {
	queries  *db.Queries
	producer *queue.Producer
}

// NewJobHandler creates a new job handler
func NewJobHandler(queries *db.Queries, producer *queue.Producer) *JobHandler {
	return &JobHandler{
		queries:  queries,
		producer: producer,
	}
}

// CreateJobRequest represents the request body for creating a job
type CreateJobRequest struct {
	InputKey    string   `json:"input_key"`
	Resolutions []string `json:"resolutions"`
}

// JobResponse represents a job in API responses
type JobResponse struct {
	ID           string              `json:"id"`
	InputKey     string              `json:"input_key"`
	Status       string              `json:"status"`
	ErrorMessage *string             `json:"error_message,omitempty"`
	CreatedAt    string              `json:"created_at"`
	UpdatedAt    string              `json:"updated_at"`
	Renditions   []RenditionResponse `json:"renditions,omitempty"`
}

// RenditionResponse represents a rendition in API responses
type RenditionResponse struct {
	ID         string  `json:"id"`
	Resolution string  `json:"resolution"`
	OutputKey  *string `json:"output_key,omitempty"`
}

// CreateJob handles POST /jobs
func (h *JobHandler) CreateJob(w http.ResponseWriter, r *http.Request) {
	var req CreateJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.InputKey == "" {
		http.Error(w, "input_key is required", http.StatusBadRequest)
		return
	}

	// Create job in database
	job, err := h.queries.CreateJob(r.Context(), req.InputKey)
	if err != nil {
		log.Printf("Failed to create job: %v", err)
		http.Error(w, "Failed to create job", http.StatusInternalServerError)
		return
	}

	// Record metric for job creation
	metrics.RecordJobCreated()

	// Convert UUID to string
	jobID := uuidToString(job.ID)

	// Create rendition records for each resolution
	resolutions := req.Resolutions
	if len(resolutions) == 0 {
		resolutions = []string{"480p", "720p", "1080p"} // Default fallback
	}
	for _, res := range resolutions {
		_, err := h.queries.CreateRendition(r.Context(), db.CreateRenditionParams{
			JobID:      job.ID,
			Resolution: res,
		})
		if err != nil {
			log.Printf("Failed to create rendition: %v", err)
			// Continue anyway - job is created
		}
	}

	// Push job to Redis queue
	if err := h.producer.Push(r.Context(), jobID); err != nil {
		log.Printf("Failed to push job to queue: %v", err)
		// Job is in DB, so we can still return success
		// A background process could re-queue stuck jobs
	}

	// Fetch renditions for response
	renditions, _ := h.queries.GetRenditionsByJobID(r.Context(), job.ID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(jobToResponse(job, renditions))
}

// GetJob handles GET /jobs/{id}
func (h *JobHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	
	jobUUID, err := uuid.Parse(idParam)
	if err != nil {
		http.Error(w, "Invalid job ID", http.StatusBadRequest)
		return
	}

	pgUUID := pgtype.UUID{
		Bytes: jobUUID,
		Valid: true,
	}

	job, err := h.queries.GetJob(r.Context(), pgUUID)
	if err != nil {
		http.Error(w, "Job not found", http.StatusNotFound)
		return
	}

	renditions, _ := h.queries.GetRenditionsByJobID(r.Context(), job.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jobToResponse(job, renditions))
}

// ListJobs handles GET /jobs
func (h *JobHandler) ListJobs(w http.ResponseWriter, r *http.Request) {
	jobs, err := h.queries.ListJobs(r.Context(), db.ListJobsParams{
		Limit:  50,
		Offset: 0,
	})
	if err != nil {
		log.Printf("Failed to list jobs: %v", err)
		http.Error(w, "Failed to list jobs", http.StatusInternalServerError)
		return
	}

	response := make([]JobResponse, 0, len(jobs))
	for _, job := range jobs {
		renditions, _ := h.queries.GetRenditionsByJobID(r.Context(), job.ID)
		response = append(response, jobToResponse(job, renditions))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Helper functions

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	return uuid.UUID(u.Bytes).String()
}

func jobToResponse(job db.Job, renditions []db.Rendition) JobResponse {
	resp := JobResponse{
		ID:           uuidToString(job.ID),
		InputKey:     job.InputKey,
		Status:       string(job.Status),
		ErrorMessage: job.ErrorMessage,
		CreatedAt:    job.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:    job.UpdatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
		Renditions:   make([]RenditionResponse, 0, len(renditions)),
	}

	for _, r := range renditions {
		resp.Renditions = append(resp.Renditions, RenditionResponse{
			ID:         uuidToString(r.ID),
			Resolution: r.Resolution,
			OutputKey:  r.OutputKey,
		})
	}

	return resp
}

