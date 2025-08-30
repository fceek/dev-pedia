# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install required packages
RUN apk add --no-cache git ca-certificates tzdata

# Copy go mod files
COPY go.mod ./
# Copy go.sum only if it exists
COPY go.su[m] ./
RUN go mod download

# Copy source code
COPY . .

# Build the application - try common main.go locations
RUN if [ -f "./cmd/server/main.go" ]; then \
      CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server; \
    elif [ -f "./main.go" ]; then \
      CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server .; \
    else \
      echo "No main.go found in ./cmd/server or root directory"; exit 1; \
    fi

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates curl

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/server .


# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD ["./server"]