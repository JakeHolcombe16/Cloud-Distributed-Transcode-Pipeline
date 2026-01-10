import { formatTime } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";
import { Check, Loader2, Clock, AlertCircle } from "lucide-react";

interface JobTimelineProps {
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

type Stage = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const stages: Stage[] = [
  { id: "queued", label: "Queued", icon: <Clock className="h-4 w-4" /> },
  { id: "processing", label: "Processing", icon: <Loader2 className="h-4 w-4" /> },
  { id: "uploading", label: "Uploading", icon: <Loader2 className="h-4 w-4" /> },
  { id: "done", label: "Done", icon: <Check className="h-4 w-4" /> },
];

function getStageIndex(status: JobStatus): number {
  switch (status) {
    case "pending":
      return 0;
    case "processing":
      return 1;
    case "completed":
      return 3;
    case "failed":
      return -1; // Failed state
    default:
      return 0;
  }
}

export function JobTimeline({ status, createdAt, updatedAt }: JobTimelineProps) {
  const currentStageIndex = getStageIndex(status);
  const isFailed = status === "failed";

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-0 right-0 top-4 h-0.5 bg-[var(--border-default)]" />
      
      {/* Progress line */}
      {!isFailed && currentStageIndex >= 0 && (
        <div
          className="absolute left-0 top-4 h-0.5 bg-[var(--accent)] transition-all duration-500"
          style={{
            width: `${(currentStageIndex / (stages.length - 1)) * 100}%`,
          }}
        />
      )}

      {/* Stages */}
      <div className="relative flex justify-between">
        {stages.map((stage, index) => {
          const isCompleted = !isFailed && index <= currentStageIndex;
          const isCurrent = !isFailed && index === currentStageIndex;
          const isActive = isCurrent && status === "processing";

          return (
            <div key={stage.id} className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                  isFailed
                    ? "border-[var(--status-failed)] bg-[var(--status-failed-bg)] text-[var(--status-failed)]"
                    : isCompleted
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-tertiary)]"
                } ${isActive ? "animate-pulse" : ""}`}
              >
                {isFailed && index === 0 ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  stage.icon
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-2 text-xs font-medium ${
                  isFailed
                    ? "text-[var(--status-failed)]"
                    : isCompleted
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)]"
                }`}
              >
                {stage.label}
              </span>

              {/* Time */}
              <span className="mt-1 text-xs text-[var(--text-tertiary)]">
                {index === 0 && formatTime(createdAt)}
                {index === stages.length - 1 &&
                  (status === "completed" || status === "failed") &&
                  formatTime(updatedAt)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Failed message */}
      {isFailed && (
        <div className="mt-4 rounded-md bg-[var(--status-failed-bg)] p-3">
          <p className="text-sm text-[var(--status-failed)]">
            Job failed. Check the logs for more details.
          </p>
        </div>
      )}
    </div>
  );
}
