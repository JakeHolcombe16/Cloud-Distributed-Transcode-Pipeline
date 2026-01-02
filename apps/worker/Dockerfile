# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install git (needed for go mod download)
RUN apk add --no-cache git

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/worker ./cmd/worker

# Runtime stage
FROM alpine:3.20

# Install ca-certificates for HTTPS and ffmpeg for transcoding
RUN apk add --no-cache ca-certificates ffmpeg

# Copy binary from builder
COPY --from=builder /bin/worker /bin/worker

# Run the binary
CMD ["/bin/worker"]

