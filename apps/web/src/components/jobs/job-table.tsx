"use client";

import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { JobStatusPill } from "./job-status-pill";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { shortenId, formatRelativeTime, formatDuration } from "@/lib/utils";
import { getJobDuration } from "@/lib/hooks/use-jobs";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { Job } from "@/lib/types";

interface JobTableProps {
  jobs: Job[];
  isLoading?: boolean;
  showViewAll?: boolean;
}

export function JobTable({ jobs, isLoading, showViewAll }: JobTableProps) {
  if (isLoading) {
    return <SkeletonTable rows={5} />;
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] py-12">
        <p className="text-sm text-[var(--text-secondary)]">No jobs found</p>
        <Link href="/new">
          <Button variant="primary" size="sm" className="mt-4">
            Create your first job
          </Button>
        </Link>
      </div>
    );
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Job ID copied to clipboard");
  };

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Renditions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const duration = getJobDuration(job);
            const completedRenditions = job.renditions.filter(
              (r) => r.outputKey
            ).length;

            return (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-xs">
                      {shortenId(job.id)}
                    </code>
                    <button
                      onClick={() => copyId(job.id)}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <JobStatusPill status={job.status} />
                </TableCell>
                <TableCell className="text-[var(--text-secondary)]">
                  {formatRelativeTime(job.createdAt)}
                </TableCell>
                <TableCell className="text-[var(--text-secondary)]">
                  {duration ? formatDuration(duration) : "—"}
                </TableCell>
                <TableCell>
                  <span className="text-[var(--text-secondary)]">
                    {completedRenditions}/{job.renditions.length}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/jobs/${job.id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {showViewAll && jobs.length > 0 && (
        <div className="border-t border-[var(--border-default)] px-4 py-3">
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="w-full">
              View all jobs →
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
