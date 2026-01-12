# Cloud Distributed Transcode Pipeline

A distributed video transcoding pipeline built with Go, demonstrating cloud-native architecture patterns used by platforms like YouTube.

## Architecture

```
                              ┌──────────────────────────────────────────────┐
                              │              Frontend Layer                   │
                              │  ┌────────────────────────────────────────┐  │
                              │  │              Next.js                    │  │
                              │  └─────────────────┬──────────────────────┘  │
                              └────────────────────┼──────────────────────────┘
                                                   │
                        ┌──────────────────────────┼──────────────────────────┐
                        │                          │                          │
                        ▼                          ▼                          │
              ┌─────────────────┐       ┌─────────────────┐                   │
              │    REST API     │       │   GraphQL API   │                   │
              │   (Go + Chi)    │       │    (gqlgen)     │                   │
              │   Port 8080     │       │   Port 8081     │                   │
              │                 │       │                 │                   │
              │ • Create jobs   │       │ • Query jobs    │                   │
              │ • Upload URLs   │       │ • Query metrics │                   │
              │ • /metrics      │       │ • /metrics      │                   │
              └────────┬────────┘       └────────┬────────┘                   │
                       │                         │                            │
          ┌────────────┼─────────────────────────┼────────────┐               │
          │            │                         │            │               │
          ▼            ▼                         ▼            │               │
   ┌────────────┐ ┌────────────┐          ┌────────────┐      │               │
   │   Redis    │ │ PostgreSQL │          │   MinIO    │      │               │
   │   Queue    │ │  Database  │          │  (S3-like) │      │               │
   └──────┬─────┘ └────────────┘          └────────────┘      │               │
          │                                      ▲            │               │
          ▼                                      │            │               │
   ┌────────────────────────────────────────────┐│            │               │
   │           Worker Pool (N replicas)         ││            │               │
   │  ┌──────────┐ ┌──────────┐ ┌──────────┐   ││            │               │
   │  │ Worker 1 │ │ Worker 2 │ │ Worker N │───┘│            │               │
   │  │ (FFmpeg) │ │ (FFmpeg) │ │ (FFmpeg) │    │            │               │
   │  │ /metrics │ │ /metrics │ │ /metrics │    │            │               │
   │  └──────────┘ └──────────┘ └──────────┘    │            │               │
   └────────────────────────────────────────────┘            │               │
                       │                                      │               │
                       └──────────────────────────────────────┘               │
                                                                              │
   ┌──────────────────────────────────────────────────────────────────────────┘
   │                        Observability Stack
   │  ┌──────────────────┐         ┌──────────────────┐
   │  │    Prometheus    │────────▶│     Grafana      │
   │  │    Port 9090     │         │    Port 3001     │
   │  │                  │         │                  │
   │  │ • Scrapes /metrics        │ • Dashboards     │
   │  │ • Time-series DB │         │ • Alerting       │
   │  └──────────────────┘         └──────────────────┘
   └───────────────────────────────────────────────────
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **REST API** | Go + Chi | Mutations (create jobs, upload URLs) |
| **GraphQL API** | Go + gqlgen | Queries (list jobs, metrics) |
| **Worker** | Go + FFmpeg | Video transcoding |
| **Queue** | Redis | Job distribution (LPUSH/BRPOP) |
| **Database** | PostgreSQL | Job state & metadata |
| **Storage** | MinIO (S3) | Video file storage |
| **Metrics** | Prometheus | Metrics collection & storage |
| **Dashboards** | Grafana | Metrics visualization |
| **Frontend** | Next.js | Upload UI & job tracking |
| **Container** | Docker | Consistent environments |
| **Orchestration** | Kubernetes | Scaling & deployment |

## Features

- **Presigned URL uploads** - Direct browser-to-storage uploads
- **Multi-resolution transcoding** - 480p, 720p, 1080p outputs
- **Job queue pattern** - Decoupled API and workers
- **Horizontal scaling** - Scale workers independently
- **Idempotent processing** - Safe retries on failure
- **GraphQL Gateway** - Flexible, client-driven queries
- **Full Observability** - Prometheus metrics + Grafana dashboards

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Kubernetes enabled
- [Go 1.23+](https://golang.org/dl/) (for local development)
- [Node.js 20+](https://nodejs.org/) (for frontend)

## Deployment Options

### Option 1: Kubernetes

**Important: Secrets Setup**

To set up secrets:

```powershell
# Option A: Use kubectl (recommended for quick start)
kubectl create namespace transcode
kubectl create secret generic transcode-secrets \
  --namespace=transcode \
  --from-literal=POSTGRES_PASSWORD=your_password \
  --from-literal=S3_ACCESS_KEY=your_access_key \
  --from-literal=S3_SECRET_KEY=your_secret_key

# Option B: Use YAML file (for production)
# 1. Copy the example template
cp deploy/k8s/secrets.yaml.example deploy/k8s/secrets.yaml

# 2. Edit deploy/k8s/secrets.yaml and replace all CHANGE_ME values)

# 3. Apply the secrets
kubectl apply -f deploy/k8s/secrets.yaml
```

**Quick Start:**
```powershell
# Enable Kubernetes in Docker Desktop first!
# Settings -> Kubernetes -> Enable Kubernetes -> Apply & Restart

# 1. Create namespace and secrets (using default dev credentials)
kubectl create namespace transcode
kubectl create secret generic transcode-secrets \
  --namespace=transcode \
  --from-literal=POSTGRES_PASSWORD=postgres \
  --from-literal=S3_ACCESS_KEY=minioadmin \
  --from-literal=S3_SECRET_KEY=minioadmin

# 2. Build Docker images
docker build -t transcode-api:latest -f apps/api/Dockerfile .
docker build -t transcode-graphql:latest -f apps/graphql/Dockerfile .
docker build -t transcode-worker:latest -f apps/worker/Dockerfile .
docker build -t transcode-web:latest -f apps/web/Dockerfile ./apps/web

# 3. Deploy all services
kubectl apply -f deploy/k8s/postgres/
kubectl apply -f deploy/k8s/redis/
kubectl apply -f deploy/k8s/minio/
kubectl apply -f deploy/k8s/api/
kubectl apply -f deploy/k8s/graphql/
kubectl apply -f deploy/k8s/worker/
kubectl apply -f deploy/k8s/monitoring/
kubectl apply -f deploy/k8s/web/

# 4. Wait for pods to be ready
kubectl get pods -n transcode -w

# 5. Access services via port-forwarding
kubectl port-forward -n transcode svc/web 3001:3000        # Frontend
kubectl port-forward -n transcode svc/grafana 3000:3000    # Grafana
kubectl port-forward -n transcode svc/api 8080:8080        # API
```

**Restarting After Docker Desktop Restart:**
```powershell
# Kubernetes automatically restarts all pods when Docker starts!
# Just check the status:
kubectl get pods -n transcode

# Then set up port forwarding:
kubectl port-forward -n transcode svc/web 3001:3000
kubectl port-forward -n transcode svc/grafana 3000:3000
```

**Access Services:**
- **Frontend:** http://localhost:3001
- **Grafana:** http://localhost:3000 (admin/admin)
- **REST API:** http://localhost:8080
- **GraphQL:** http://localhost:8081

### Option 2: Docker Compose (Quick Local Testing)

```bash
# 1. Navigate to compose directory
cd deploy/compose

# 2. Copy environment template and configure
cp env.template .env
# Edit .env with your preferred values

# 3. Start all services
docker compose up --build

# 4. Services available at:
#    - REST API:         http://localhost:8080
#    - GraphQL API:      http://localhost:8081
#    - GraphQL Playground: http://localhost:8081/
#    - Prometheus:       http://localhost:9090
#    - Grafana:          http://localhost:3001 (admin/admin)
#    - Front-End GUI:    http://localhost:3000
#    - MinIO Console:    http://localhost:9001
#    - PostgreSQL:       localhost:5432
#    - Redis:            localhost:6379
```

### Testing the REST API

```bash
# Create a job
curl -X POST http://localhost:8080/jobs \
  -H "Content-Type: application/json" \
  -d '{"input_key": "uploads/test/video.mp4"}'

# Check job status
curl http://localhost:8080/jobs/{job_id}

# List all jobs
curl http://localhost:8080/jobs
```

### Testing the GraphQL API

Visit the GraphQL Playground at http://localhost:8081/ and run:

```graphql
# List all jobs with their renditions
query {
  jobs(limit: 10) {
    id
    status
    inputKey
    createdAt
    renditions {
      resolution
      outputKey
    }
  }
}

# Get system metrics
query {
  systemMetrics {
    queueDepth
    totalJobs
    completedJobs
    failedJobs
    processingJobs
  }
}

# Get a specific job
query {
  job(id: "your-job-uuid") {
    id
    status
    errorMessage
    renditions {
      resolution
      outputKey
    }
  }
}
```

## Project Structure

```
├── apps/
│   ├── api/                 # REST API server (mutations)
│   │   ├── cmd/api/         # Entry point
│   │   ├── internal/
│   │   │   ├── config/      # Environment config
│   │   │   ├── db/          # sqlc generated code
│   │   │   ├── handler/     # HTTP handlers
│   │   │   ├── metrics/     # Prometheus instrumentation
│   │   │   ├── queue/       # Redis producer
│   │   │   └── storage/     # S3 client
│   │   └── sql/             # Schema & queries
│   ├── graphql/             # GraphQL API server (queries)
│   │   ├── cmd/graphql/     # Entry point
│   │   ├── internal/
│   │   │   ├── config/      # Environment config
│   │   │   ├── db/          # sqlc generated code
│   │   │   ├── graph/       # GraphQL schema & resolvers
│   │   │   └── metrics/     # Prometheus instrumentation
│   │   └── sql/             # Read-only queries
│   ├── worker/              # Worker service
│   │   ├── cmd/worker/      # Entry point
│   │   └── internal/
│   │       ├── metrics/     # Prometheus instrumentation
│   │       ├── queue/       # Redis consumer
│   │       ├── storage/     # S3 client
│   │       └── transcoder/  # FFmpeg wrapper
│   └── web/                 # Next.js frontend
├── deploy/
│   ├── compose/             # Docker Compose setup
│   ├── grafana/             # Grafana provisioning
│   │   └── provisioning/
│   │       ├── dashboards/  # Dashboard JSON files
│   │       └── datasources/ # Prometheus datasource
│   ├── prometheus/          # Prometheus config
│   └── k8s/                 # Kubernetes manifests
└── docs/                    # Documentation
```

## API Endpoints

### REST API (Port 8080)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/metrics` | Prometheus metrics |
| `POST` | `/jobs` | Create transcoding job |
| `GET` | `/jobs` | List all jobs |
| `GET` | `/jobs/:id` | Get job status |
| `GET` | `/upload-url` | Get presigned upload URL |
| `GET` | `/download-url/*` | Get presigned download URL |

### GraphQL API (Port 8081)

| Endpoint | Description |
|----------|-------------|
| `/` | GraphQL Playground |
| `/query` | GraphQL endpoint |
| `/health` | Health check |
| `/metrics` | Prometheus metrics |

## Observability

### Prometheus Metrics

All services expose metrics at `/metrics`:

**REST API:**
- `http_requests_total` - Request count by method, endpoint, status
- `http_request_duration_seconds` - Request latency histogram
- `jobs_created_total` - Total jobs created

**Worker:**
- `jobs_processed_total` - Jobs processed by status (completed/failed)
- `job_duration_seconds` - Transcode duration by resolution
- `transcode_errors_total` - Transcode errors by resolution
- `queue_depth` - Jobs waiting in queue
- `active_jobs` - Jobs currently processing

**GraphQL API:**
- `graphql_requests_total` - GraphQL request count
- `graphql_request_duration_seconds` - GraphQL request latency

### Grafana Dashboards

Access Grafana at http://localhost:3001 (default: admin/admin)

Pre-configured dashboard includes:
- Total jobs created
- Jobs completed/failed
- Queue depth
- Active workers
- API request rate
- Job processing rate
- Transcode duration by resolution
- Error rates

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | `postgres` |
| `S3_ACCESS_KEY` | MinIO/S3 access key | `minioadmin` |
| `S3_SECRET_KEY` | MinIO/S3 secret key | `minioadmin` |
| `API_PORT` | REST API server port | `8080` |
| `GRAPHQL_PORT` | GraphQL API server port | `8081` |

See `deploy/compose/env.template` for full list.

## Architecture Decisions

### REST vs GraphQL Separation

- **REST API** handles **mutations** (creates, updates) - job creation, file uploads
- **GraphQL API** handles **queries** - listing jobs, fetching status, metrics

### Microservices Pattern

Each service is independently deployable:
- `apps/api` - REST mutations
- `apps/graphql` - GraphQL queries  
- `apps/worker` - Job processing
