"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSystemMetrics } from "../api/graphql";

/**
 * Query key for system metrics
 */
export const metricsKeys = {
  all: ["metrics"] as const,
  system: () => [...metricsKeys.all, "system"] as const,
};

/**
 * Hook to fetch system metrics with polling
 */
export function useSystemMetrics(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const { enabled = true, refetchInterval = 2000 } = options || {};

  return useQuery({
    queryKey: metricsKeys.system(),
    queryFn: fetchSystemMetrics,
    enabled,
    refetchInterval,
    staleTime: 1000,
  });
}
