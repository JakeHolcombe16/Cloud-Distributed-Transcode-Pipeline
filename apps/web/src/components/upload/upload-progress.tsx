import { formatBytes } from "@/lib/utils";
import type { UploadState } from "@/lib/hooks/use-upload";
import { Loader2, CheckCircle2, XCircle, Upload, Link } from "lucide-react";

interface UploadProgressProps {
  state: UploadState;
  progress: number;
  error: string | null;
  fileName: string;
  fileSize: number;
}

const stateLabels: Record<UploadState, string> = {
  idle: "Ready",
  validating: "Validating file...",
  "getting-url": "Preparing upload...",
  uploading: "Uploading...",
  complete: "Upload complete",
  error: "Upload failed",
};

const stateIcons: Record<UploadState, React.ReactNode> = {
  idle: <Upload className="h-4 w-4" />,
  validating: <Loader2 className="h-4 w-4 animate-spin" />,
  "getting-url": <Link className="h-4 w-4 animate-pulse" />,
  uploading: <Loader2 className="h-4 w-4 animate-spin" />,
  complete: <CheckCircle2 className="h-4 w-4 text-[var(--status-completed)]" />,
  error: <XCircle className="h-4 w-4 text-[var(--status-failed)]" />,
};

export function UploadProgress({
  state,
  progress,
  error,
  fileName,
  fileSize,
}: UploadProgressProps) {
  const uploadedBytes = Math.round((progress / 100) * fileSize);

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {stateIcons[state]}
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {stateLabels[state]}
          </span>
        </div>
        {state === "uploading" && (
          <span className="text-sm text-[var(--text-secondary)]">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {(state === "uploading" || state === "complete") && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              state === "complete"
                ? "bg-[var(--status-completed)]"
                : "bg-[var(--accent)]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* File info */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span className="truncate max-w-[60%]">{fileName}</span>
        <span>
          {state === "uploading"
            ? `${formatBytes(uploadedBytes)} / ${formatBytes(fileSize)}`
            : formatBytes(fileSize)}
        </span>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-[var(--status-failed)]">{error}</p>
      )}
    </div>
  );
}
