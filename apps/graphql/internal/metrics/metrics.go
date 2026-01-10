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
	// GraphQLRequestsTotal counts all GraphQL requests
	GraphQLRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "graphql_requests_total",
			Help: "Total number of GraphQL requests",
		},
		[]string{"operation", "status"},
	)

	// GraphQLRequestDuration measures GraphQL request latency
	GraphQLRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "graphql_request_duration_seconds",
			Help:    "GraphQL request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"operation"},
	)

	// HTTPRequestsTotal counts all HTTP requests
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests by method, endpoint, and status code",
		},
		[]string{"method", "endpoint", "status"},
	)

	// HTTPRequestDuration measures HTTP request latency
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// ActiveConnections tracks active HTTP connections
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

// RecordGraphQLRequest records a GraphQL request metric
func RecordGraphQLRequest(operation string, success bool, duration time.Duration) {
	status := "success"
	if !success {
		status = "error"
	}
	GraphQLRequestsTotal.WithLabelValues(operation, status).Inc()
	GraphQLRequestDuration.WithLabelValues(operation).Observe(duration.Seconds())
}
