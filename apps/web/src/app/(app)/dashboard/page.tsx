"use client";

import Link from "next/link";
import { MetricsGrid } from "@/components/metrics/metrics-grid";
import { JobTable } from "@/components/jobs/job-table";
import { Button } from "@/components/ui/button";
import { useRecentJobs } from "@/lib/hooks/use-jobs";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  const { data: jobs, isLoading, error } = useRecentJobs(10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Monitor your transcoding pipeline in real-time
          </p>
        </div>
        <Link href="/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <MetricsGrid />

      {/* Recent Jobs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">
            Recent Jobs
          </h2>
        </div>
        {error ? (
          <div className="rounded-lg border border-[var(--status-failed)] bg-[var(--status-failed-bg)] p-4">
            <p className="text-sm text-[var(--status-failed)]">
              Failed to load jobs. Please check if the API is running.
            </p>
          </div>
        ) : (
          <JobTable jobs={jobs || []} isLoading={isLoading} showViewAll />
        )}
      </div>
    </div>
  );
}
