package metrics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	// HTTPRequestsTotal counts all HTTP requests by method, endpoint, and status code
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests by method, endpoint, and status code",
		},
		[]string{"method", "endpoint", "status"},
	)

	// HTTPRequestDuration measures request latency in seconds
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// JobsCreatedTotal counts the total number of jobs created
	JobsCreatedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "jobs_created_total",
			Help: "Total number of transcoding jobs created",
		},
	)

	// ActiveConnections tracks the number of active HTTP connections
	ActiveConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_connections",
			Help: "Number of active HTTP connections",
		},
	)
)

// Handler returns the Prometheus metrics HTTP handler
func Handler() http.Handler {
	return promhttp.Handler()
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{w, http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// Middleware instruments HTTP handlers with Prometheus metrics
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip metrics endpoint itself
		if r.URL.Path == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}

		ActiveConnections.Inc()
		defer ActiveConnections.Dec()

		start := time.Now()
		wrapped := newResponseWriter(w)

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start).Seconds()

		// Get the route pattern for consistent labeling
		routePattern := getRoutePattern(r)

		HTTPRequestsTotal.WithLabelValues(
			r.Method,
			routePattern,
			strconv.Itoa(wrapped.statusCode),
		).Inc()

		HTTPRequestDuration.WithLabelValues(
			r.Method,
			routePattern,
		).Observe(duration)
	})
}

// getRoutePattern extracts the route pattern from chi context
func getRoutePattern(r *http.Request) string {
	rctx := chi.RouteContext(r.Context())
	if rctx != nil && rctx.RoutePattern() != "" {
		return rctx.RoutePattern()
	}
	return r.URL.Path
}

// RecordJobCreated increments the jobs created counter
func RecordJobCreated() {
	JobsCreatedTotal.Inc()
}
