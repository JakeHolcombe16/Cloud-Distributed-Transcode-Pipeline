"use client";

import { StatCard } from "./stat-card";
import { useSystemMetrics } from "@/lib/hooks/use-metrics";
import { ListOrdered, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function MetricsGrid() {
  const { data: metrics, isLoading, error } = useSystemMetrics();

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--status-failed)] bg-[var(--status-failed-bg)] p-4">
        <p className="text-sm text-[var(--status-failed)]">
          Failed to load metrics. Please check if the API is running.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Queue Depth"
        value={metrics?.queueDepth ?? 0}
        icon={<ListOrdered className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        label="Processing"
        value={metrics?.processingJobs ?? 0}
        icon={<Loader2 className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        label="Completed"
        value={metrics?.completedJobs ?? 0}
        icon={<CheckCircle2 className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        label="Failed"
        value={metrics?.failedJobs ?? 0}
        icon={<AlertCircle className="h-4 w-4" />}
        isLoading={isLoading}
      />
    </div>
  );
}
