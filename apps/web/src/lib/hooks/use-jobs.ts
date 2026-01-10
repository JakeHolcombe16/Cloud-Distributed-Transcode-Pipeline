"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJobs, fetchJob } from "../api/graphql";
import { createJob } from "../api/rest";
import { toast } from "sonner";
import type { JobStatus, Job } from "../types";

/**
 * Query key factory for jobs
 */
export const jobKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobKeys.all, "list"] as const,
  list: (filters: { status?: JobStatus; limit?: number }) =>
    [...jobKeys.lists(), filters] as const,
  details: () => [...jobKeys.all, "detail"] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
};

/**
 * Hook to fetch jobs list with polling
 */
export function useJobs(options?: {
  status?: JobStatus;
  limit?: number;
  offset?: number;
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const {
    status,
    limit = 50,
    offset = 0,
    enabled = true,
    refetchInterval = 2000,
  } = options || {};

  return useQuery({
    queryKey: jobKeys.list({ status, limit }),
    queryFn: () => fetchJobs({ status, limit, offset }),
    enabled,
    refetchInterval,
    staleTime: 1000,
  });
}

/**
 * Hook to fetch a single job with polling
 */
export function useJob(id: string, options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const { enabled = true, refetchInterval = 2000 } = options || {};

  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => fetchJob({ id }),
    enabled: enabled && !!id,
    refetchInterval,
    staleTime: 1000,
  });
}

/**
 * Hook to create a new job
 */
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputKey: string) => createJob(inputKey),
    onSuccess: (data) => {
      // Invalidate jobs list to trigger refetch
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      toast.success(`Job ${data.id.slice(0, 8)} created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create job: ${error.message}`);
    },
  });
}

/**
 * Hook to get recent jobs (for dashboard)
 */
export function useRecentJobs(limit: number = 10) {
  return useJobs({ limit, refetchInterval: 2000 });
}

/**
 * Calculate job duration if completed
 */
export function getJobDuration(job: Job): number | null {
  if (job.status !== "completed" && job.status !== "failed") {
    return null;
  }
  const start = new Date(job.createdAt).getTime();
  const end = new Date(job.updatedAt).getTime();
  return (end - start) / 1000; // seconds
}
