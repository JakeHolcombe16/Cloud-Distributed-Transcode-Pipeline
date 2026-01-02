# Cloud Distributed Transcode Pipeline

A distributed video transcoding pipeline built with Go, demonstrating cloud-native architecture patterns used by platforms like YouTube.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   Go API    │────▶│   Redis     │
│   Frontend  │     │   Server    │     │   Queue     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  PostgreSQL │     │  Go Worker  │
                    │   Database  │     │  (FFmpeg)   │
                    └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   MinIO     │
                                        │  (S3-like)  │
                                        └─────────────┘
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API** | Go + Chi | REST API server |
| **Worker** | Go + FFmpeg | Video transcoding |
| **Queue** | Redis | Job distribution (LPUSH/BRPOP) |
| **Database** | PostgreSQL | Job state & metadata |
| **Storage** | MinIO (S3) | Video file storage |
| **Frontend** | Next.js | Upload UI & job tracking |
| **Container** | Docker | Consistent environments |
| **Orchestration** | Kubernetes | Scaling & deployment |

## Features

- **Presigned URL uploads** - Direct browser-to-storage uploads
- **Multi-resolution transcoding** - 480p, 720p, 1080p outputs
- **Job queue pattern** - Decoupled API and workers
- **Horizontal scaling** - Scale workers independently
- **Idempotent processing** - Safe retries on failure

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Go 1.23+](https://golang.org/dl/) (for local development)
- [Node.js 20+](https://nodejs.org/) (for frontend)

### Running with Docker

```bash
# 1. Navigate to compose directory
cd deploy/compose

# 2. Copy environment template and configure
cp env.template .env
# Edit .env with your preferred values

# 3. Start all services
docker compose up --build

# 4. Services available at:
#    - API:          http://localhost:8080
#    - MinIO Console: http://localhost:9001
#    - PostgreSQL:   localhost:5432
#    - Redis:        localhost:6379
```

### Testing the API

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

## Project Structure

```
├── apps/
│   ├── api/                 # Go API server
│   │   ├── cmd/api/         # Entry point
│   │   ├── internal/        # Private packages
│   │   │   ├── config/      # Environment config
│   │   │   ├── db/          # sqlc generated code
│   │   │   ├── handler/     # HTTP handlers
│   │   │   └── queue/       # Redis producer
│   │   └── sql/             # Schema & queries
│   ├── worker/              # Go worker service
│   │   ├── cmd/worker/      # Entry point
│   │   └── internal/        # Private packages
│   └── web/                 # Next.js frontend
├── deploy/
│   ├── compose/             # Docker Compose setup
│   └── k8s/                 # Kubernetes manifests
└── docs/                    # Documentation
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/jobs` | Create transcoding job |
| `GET` | `/jobs` | List all jobs |
| `GET` | `/jobs/:id` | Get job status |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | `postgres` |
| `S3_ACCESS_KEY` | MinIO/S3 access key | `minioadmin` |
| `S3_SECRET_KEY` | MinIO/S3 secret key | `minioadmin` |
| `API_PORT` | API server port | `8080` |

See `deploy/compose/env.template` for full list.

