import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/types";

interface JobStatusPillProps {
  status: JobStatus;
  showDot?: boolean;
}

const statusConfig: Record<JobStatus, { label: string; variant: "pending" | "processing" | "completed" | "failed" }> = {
  pending: { label: "Queued", variant: "pending" },
  processing: { label: "Processing", variant: "processing" },
  completed: { label: "Completed", variant: "completed" },
  failed: { label: "Failed", variant: "failed" },
};

export function JobStatusPill({ status, showDot = true }: JobStatusPillProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="gap-1.5">
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status === "processing" ? "animate-pulse" : ""
          }`}
          style={{
            backgroundColor:
              status === "pending"
                ? "var(--status-pending)"
                : status === "processing"
                ? "var(--status-processing)"
                : status === "completed"
                ? "var(--status-completed)"
                : "var(--status-failed)",
          }}
        />
      )}
      {config.label}
    </Badge>
  );
}
