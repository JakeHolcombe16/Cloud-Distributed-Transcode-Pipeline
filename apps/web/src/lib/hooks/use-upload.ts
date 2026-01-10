"use client";

import { useState, useCallback } from "react";
import { getUploadUrl, uploadFileToS3 } from "../api/rest";
import { validateUploadFile, sanitizeFilename } from "../validation/schemas";
import { toast } from "sonner";

export type UploadState = "idle" | "validating" | "getting-url" | "uploading" | "complete" | "error";

export interface UploadProgress {
  state: UploadState;
  progress: number;
  error: string | null;
  key: string | null;
}

/**
 * Hook for handling file uploads with progress tracking
 */
export function useUpload() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    state: "idle",
    progress: 0,
    error: null,
    key: null,
  });

  const reset = useCallback(() => {
    setUploadProgress({
      state: "idle",
      progress: 0,
      error: null,
      key: null,
    });
  }, []);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    try {
      // Validate file
      setUploadProgress({ state: "validating", progress: 0, error: null, key: null });
      const validation = validateUploadFile(file);
      if (!validation.valid) {
        const errorMsg = validation.errors.join(", ");
        setUploadProgress({ state: "error", progress: 0, error: errorMsg, key: null });
        toast.error(errorMsg);
        return null;
      }

      // Sanitize filename
      const sanitizedName = sanitizeFilename(file.name);

      // Get presigned upload URL
      setUploadProgress({ state: "getting-url", progress: 0, error: null, key: null });
      const { url, key } = await getUploadUrl(sanitizedName);

      // Upload file to S3
      setUploadProgress({ state: "uploading", progress: 0, error: null, key });
      await uploadFileToS3(url, file, (progress) => {
        setUploadProgress({ state: "uploading", progress, error: null, key });
      });

      // Complete
      setUploadProgress({ state: "complete", progress: 100, error: null, key });
      toast.success("File uploaded successfully");
      return key;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Upload failed";
      setUploadProgress({ state: "error", progress: 0, error: errorMsg, key: null });
      toast.error(errorMsg);
      return null;
    }
  }, []);

  return {
    upload,
    reset,
    ...uploadProgress,
    isUploading: uploadProgress.state === "uploading",
    isComplete: uploadProgress.state === "complete",
    isError: uploadProgress.state === "error",
  };
}
