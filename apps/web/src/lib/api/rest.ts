import { restApi } from "./client";
import type {
  UploadURLResponse,
  DownloadURLResponse,
  CreateJobRequest,
  CreateJobResponse,
} from "../types";

/**
 * Get a presigned upload URL for a file
 */
export async function getUploadUrl(filename: string): Promise<UploadURLResponse> {
  const encodedFilename = encodeURIComponent(filename);
  return restApi.get<UploadURLResponse>(`/upload-url?filename=${encodedFilename}`);
}

/**
 * Get a presigned download URL for an output file
 */
export async function getDownloadUrl(key: string): Promise<DownloadURLResponse> {
  return restApi.get<DownloadURLResponse>(`/download-url/${key}`);
}

/**
 * Create a new transcoding job
 */
export async function createJob(inputKey: string, resolutions: string[]): Promise<CreateJobResponse> {
  const request: CreateJobRequest = { input_key: inputKey, resolutions };
  return restApi.post<CreateJobResponse>("/jobs", request);
}

/**
 * Upload a file directly to S3 using a presigned URL
 * Returns upload progress via callback
 */
export async function uploadFileToS3(
  presignedUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed due to network error"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload was cancelled"));
    });

    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}
