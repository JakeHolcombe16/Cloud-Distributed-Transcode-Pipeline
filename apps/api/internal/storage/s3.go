package storage

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// Storage handles S3/MinIO operations
type Storage struct {
	client    *s3.Client        // Internal client for server-to-server operations
	presigner *s3.PresignClient // Presigner using public endpoint
	bucket    string
}

// Config holds S3 configuration
type Config struct {
	Endpoint       string
	PublicEndpoint string // Public endpoint for presigned URLs (browser access)
	AccessKey      string
	SecretKey      string
	Bucket         string
	Region         string
	UsePathStyle   bool
}

// New creates a new Storage client
func New(cfg Config) (*Storage, error) {
	// Create custom credentials provider
	creds := credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, "")

	// Load AWS config
	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(cfg.Region),
		config.WithCredentialsProvider(creds),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Create S3 client with internal endpoint (for server-to-server operations)
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(cfg.Endpoint)
		o.UsePathStyle = cfg.UsePathStyle
	})

	// Determine public endpoint for presigned URLs
	publicEndpoint := cfg.PublicEndpoint
	if publicEndpoint == "" {
		publicEndpoint = cfg.Endpoint
	}

	// Create a separate S3 client for presigning with the PUBLIC endpoint
	// This ensures the signature matches when the browser sends requests to localhost
	presignClient := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(publicEndpoint)
		o.UsePathStyle = cfg.UsePathStyle
	})
	presigner := s3.NewPresignClient(presignClient)

	return &Storage{
		client:    client,
		presigner: presigner,
		bucket:    cfg.Bucket,
	}, nil
}

// GenerateUploadURL creates a presigned PUT URL for uploading a file
func (s *Storage) GenerateUploadURL(ctx context.Context, key string, expires time.Duration) (string, error) {
	req, err := s.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expires))
	if err != nil {
		return "", fmt.Errorf("failed to generate upload URL: %w", err)
	}
	return req.URL, nil
}

// GenerateDownloadURL creates a presigned GET URL for downloading a file
func (s *Storage) GenerateDownloadURL(ctx context.Context, key string, expires time.Duration) (string, error) {
	req, err := s.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expires))
	if err != nil {
		return "", fmt.Errorf("failed to generate download URL: %w", err)
	}
	return req.URL, nil
}

// ObjectExists checks if an object exists in the bucket
func (s *Storage) ObjectExists(ctx context.Context, key string) (bool, error) {
	_, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		// Check if the error is because the object doesn't exist
		return false, nil
	}
	return true, nil
}
