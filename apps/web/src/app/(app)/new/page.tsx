"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dropzone } from "@/components/upload/dropzone";
import { UploadProgress } from "@/components/upload/upload-progress";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpload } from "@/lib/hooks/use-upload";
import { useCreateJob } from "@/lib/hooks/use-jobs";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function NewJobPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRenditions, setSelectedRenditions] = useState({
    "480p": true,
    "720p": true,
    "1080p": true,
  });

  const {
    upload,
    reset: resetUpload,
    state: uploadState,
    progress: uploadProgress,
    error: uploadError,
    isUploading,
    isComplete: uploadComplete,
  } = useUpload();

  const createJob = useCreateJob();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    resetUpload();
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    // Upload file first
    const key = await upload(selectedFile);
    if (!key) return;

    // Get selected resolutions as array
    const resolutions = Object.entries(selectedRenditions)
      .filter(([, selected]) => selected)
      .map(([resolution]) => resolution);

    // Create job with uploaded file key and selected resolutions
    createJob.mutate(
      { inputKey: key, resolutions },
      {
        onSuccess: (data) => {
          // Navigate to job detail page
          router.push(`/jobs/${data.id}`);
        },
      }
    );
  };

  const handleCancel = () => {
    setSelectedFile(null);
    resetUpload();
  };

  const isSubmitting = isUploading || createJob.isPending;
  const hasSelectedResolutions = Object.values(selectedRenditions).some(Boolean);
  const canSubmit = selectedFile && !isSubmitting && !uploadComplete && hasSelectedResolutions;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Create Transcode Job
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Upload a video file to start a new transcoding job
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Video File</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadState === "idle" || uploadState === "error" ? (
            <Dropzone
              onFileSelect={handleFileSelect}
              disabled={isSubmitting}
            />
          ) : selectedFile ? (
            <UploadProgress
              state={uploadState}
              progress={uploadProgress}
              error={uploadError}
              fileName={selectedFile.name}
              fileSize={selectedFile.size}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Renditions Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Output Renditions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {(["480p", "720p", "1080p"] as const).map((resolution) => (
              <label
                key={resolution}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={selectedRenditions[resolution]}
                  onChange={(e) =>
                    setSelectedRenditions((prev) => ({
                      ...prev,
                      [resolution]: e.target.checked,
                    }))
                  }
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-[var(--border-default)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {resolution}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--text-tertiary)]">
            Select the resolutions you want to generate. At least one is required.
          </p>
        </CardContent>
      </Card>

      {/* Job Creation Status */}
      {uploadComplete && createJob.isPending && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
              <span className="text-sm text-[var(--text-primary)]">
                Creating transcoding job...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {uploadComplete && createJob.isSuccess && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-[var(--status-completed)]" />
              <span className="text-sm text-[var(--text-primary)]">
                Job created! Redirecting...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={isSubmitting && !uploadComplete}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : createJob.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Job...
            </>
          ) : (
            "Submit Job"
          )}
        </Button>
      </div>
    </div>
  );
}
