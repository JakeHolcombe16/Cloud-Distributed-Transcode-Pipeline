// Job status enum matching backend
export type JobStatus = "pending" | "processing" | "completed" | "failed";

// Job from GraphQL API
export interface Job {
  id: string;
  status: JobStatus;
  inputKey: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  renditions: Rendition[];
}

// Rendition from GraphQL API
export interface Rendition {
  id: string;
  resolution: string;
  outputKey: string | null;
}

// System metrics from GraphQL API
export interface SystemMetrics {
  queueDepth: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  processingJobs: number;
}

// Upload URL response from REST API
export interface UploadURLResponse {
  url: string;
  key: string;
  expiresAt: string;
}

// Download URL response from REST API
export interface DownloadURLResponse {
  url: string;
  expiresAt: string;
}

// Create job request
export interface CreateJobRequest {
  input_key: string;
}

// Create job response from REST API
export interface CreateJobResponse {
  id: string;
  input_key: string;
  status: JobStatus;
  error_message?: string;
  created_at: string;
  updated_at: string;
  renditions: {
    id: string;
    resolution: string;
    output_key?: string;
  }[];
}

// GraphQL query variables
export type JobsQueryVariables = {
  limit?: number;
  offset?: number;
  status?: JobStatus;
} & Record<string, unknown>;

export type JobQueryVariables = {
  id: string;
} & Record<string, unknown>;
