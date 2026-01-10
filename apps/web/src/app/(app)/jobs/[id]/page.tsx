"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useJob } from "@/lib/hooks/use-jobs";
import { JobStatusPill } from "@/components/jobs/job-status-pill";
import { JobTimeline } from "@/components/jobs/job-timeline";
import { OutputsCard } from "@/components/jobs/outputs-card";
import { LogViewer } from "@/components/jobs/log-viewer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, Copy } from "lucide-react";
import { shortenId, formatDateTime, formatDuration } from "@/lib/utils";
import { getJobDuration } from "@/lib/hooks/use-jobs";
import { toast } from "sonner";

// Dynamic import for Three.js to avoid SSR issues
const PipelineViz = dynamic(
  () => import("@/components/three/pipeline-viz"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" />,
  }
);

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = use(params);
  const { data: job, isLoading, error, refetch } = useJob(id);

  const copyId = () => {
    navigator.clipboard.writeText(id);
    toast.success("Job ID copied to clipboard");
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>
        <div className="rounded-lg border border-[var(--status-failed)] bg-[var(--status-failed-bg)] p-4">
          <p className="text-sm text-[var(--status-failed)]">
            Failed to load job. It may not exist or the API is unavailable.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !job) {
    return (
      <div className="space-y-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const duration = getJobDuration(job);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Job #{shortenId(job.id)}
            </h1>
            <JobStatusPill status={job.status} />
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-[var(--text-secondary)]">
            <button
              onClick={copyId}
              className="inline-flex items-center gap-1 font-mono text-xs hover:text-[var(--text-primary)]"
            >
              <Copy className="h-3 w-3" />
              {job.id}
            </button>
          </div>
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <JobTimeline
            status={job.status}
            createdAt={job.createdAt}
            updatedAt={job.updatedAt}
          />
        </CardContent>
      </Card>

      {/* Info + Outputs + Pipeline Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Job Info */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-[var(--text-secondary)]">Input File</dt>
                <dd className="text-sm font-mono text-[var(--text-primary)] truncate max-w-48">
                  {job.inputKey.split("/").pop()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-[var(--text-secondary)]">Created</dt>
                <dd className="text-sm text-[var(--text-primary)]">
                  {formatDateTime(job.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-[var(--text-secondary)]">Updated</dt>
                <dd className="text-sm text-[var(--text-primary)]">
                  {formatDateTime(job.updatedAt)}
                </dd>
              </div>
              {duration && (
                <div className="flex justify-between">
                  <dt className="text-sm text-[var(--text-secondary)]">Duration</dt>
                  <dd className="text-sm text-[var(--text-primary)]">
                    {formatDuration(duration)}
                  </dd>
                </div>
              )}
              {job.errorMessage && (
                <div className="flex justify-between">
                  <dt className="text-sm text-[var(--text-secondary)]">Error</dt>
                  <dd className="text-sm text-[var(--status-failed)]">
                    {job.errorMessage}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Outputs */}
        <OutputsCard renditions={job.renditions} />
      </div>

      {/* Pipeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PipelineViz status={job.status} />
        </CardContent>
      </Card>

      {/* Logs */}
      <LogViewer job={job} />
    </div>
  );
}
