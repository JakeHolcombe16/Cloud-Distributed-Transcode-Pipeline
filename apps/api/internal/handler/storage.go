package handler

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/JakeHolcombe16/Cloud-Distributed-Transcode-Pipeline/apps/api/internal/storage"
)

const (
	// Default expiration time for presigned URLs
	defaultURLExpiration = 15 * time.Minute

	// Maximum filename length
	maxFilenameLength = 255
)

var (
	// Allowed video file extensions
	allowedExtensions = map[string]bool{
		".mp4":  true,
		".mov":  true,
		".avi":  true,
		".mkv":  true,
		".webm": true,
		".m4v":  true,
		".wmv":  true,
		".flv":  true,
	}

	// Regex for safe filename characters (alphanumeric, dash, underscore, dot)
	safeFilenameRegex = regexp.MustCompile(`^[a-zA-Z0-9._-]+$`)
)

// StorageHandler handles storage-related HTTP requests
type StorageHandler struct {
	storage *storage.Storage
}

// NewStorageHandler creates a new storage handler
func NewStorageHandler(s *storage.Storage) *StorageHandler {
	return &StorageHandler{storage: s}
}

// UploadURLResponse represents the response for upload URL generation
type UploadURLResponse struct {
	URL       string `json:"url"`
	Key       string `json:"key"`
	ExpiresAt string `json:"expires_at"`
}

// DownloadURLResponse represents the response for download URL generation
type DownloadURLResponse struct {
	URL       string `json:"url"`
	ExpiresAt string `json:"expires_at"`
}

// GetUploadURL handles GET /upload-url?filename=video.mp4
func (h *StorageHandler) GetUploadURL(w http.ResponseWriter, r *http.Request) {
	filename := r.URL.Query().Get("filename")
	if filename == "" {
		http.Error(w, "filename query parameter is required", http.StatusBadRequest)
		return
	}

	// Validate filename length
	if len(filename) > maxFilenameLength {
		http.Error(w, "filename too long", http.StatusBadRequest)
		return
	}

	// Validate filename contains only safe characters
	if !safeFilenameRegex.MatchString(filename) {
		http.Error(w, "filename contains invalid characters", http.StatusBadRequest)
		return
	}

	// Validate and get file extension
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" {
		http.Error(w, "filename must have an extension", http.StatusBadRequest)
		return
	}

	// Validate extension is allowed
	if !allowedExtensions[ext] {
		http.Error(w, "file type not allowed", http.StatusBadRequest)
		return
	}

	// Generate unique key: uploads/{uuid}/input{ext}
	uploadID := uuid.New().String()
	key := "uploads/" + uploadID + "/input" + ext

	// Generate presigned upload URL
	url, err := h.storage.GenerateUploadURL(r.Context(), key, defaultURLExpiration)
	if err != nil {
		http.Error(w, "Failed to generate upload URL", http.StatusInternalServerError)
		return
	}

	expiresAt := time.Now().Add(defaultURLExpiration)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(UploadURLResponse{
		URL:       url,
		Key:       key,
		ExpiresAt: expiresAt.Format(time.RFC3339),
	})
}

// GetDownloadURL handles GET /download-url/{key}
// The key is passed as a path parameter with the full path encoded
// Example: /download-url/outputs/abc123/480p.mp4
func (h *StorageHandler) GetDownloadURL(w http.ResponseWriter, r *http.Request) {
	// Get the key from the URL path (everything after /download-url/)
	key := chi.URLParam(r, "*")
	if key == "" {
		http.Error(w, "key path parameter is required", http.StatusBadRequest)
		return
	}

	// prevent directory traversal
	if strings.Contains(key, "..") {
		http.Error(w, "invalid key", http.StatusBadRequest)
		return
	}

	// only allow downloads from outputs directory
	// This prevents users from downloading other users' uploads
	if !strings.HasPrefix(key, "outputs/") {
		http.Error(w, "access denied", http.StatusForbidden)
		return
	}

	// Validate key length
	if len(key) > 500 {
		http.Error(w, "key too long", http.StatusBadRequest)
		return
	}

	// Generate presigned download URL
	url, err := h.storage.GenerateDownloadURL(r.Context(), key, defaultURLExpiration)
	if err != nil {
		http.Error(w, "Failed to generate download URL", http.StatusInternalServerError)
		return
	}

	expiresAt := time.Now().Add(defaultURLExpiration)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(DownloadURLResponse{
		URL:       url,
		ExpiresAt: expiresAt.Format(time.RFC3339),
	})
}
