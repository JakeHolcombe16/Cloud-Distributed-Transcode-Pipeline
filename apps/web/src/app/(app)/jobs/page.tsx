"use client";

import { useState } from "react";
import Link from "next/link";
import { JobTable } from "@/components/jobs/job-table";
import { Button } from "@/components/ui/button";
import { useJobs } from "@/lib/hooks/use-jobs";
import { Plus, Filter } from "lucide-react";
import type { JobStatus } from "@/lib/types";

const statusFilters: { value: JobStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");

  const { data: jobs, isLoading, error } = useJobs({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Jobs
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            View and manage all transcoding jobs
          </p>
        </div>
        <Link href="/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[var(--text-tertiary)]" />
        <div className="flex gap-1">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table */}
      {error ? (
        <div className="rounded-lg border border-[var(--status-failed)] bg-[var(--status-failed-bg)] p-4">
          <p className="text-sm text-[var(--status-failed)]">
            Failed to load jobs. Please check if the API is running.
          </p>
        </div>
      ) : (
        <JobTable jobs={jobs || []} isLoading={isLoading} />
      )}
    </div>
  );
}
