import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Metrics grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <SkeletonTable rows={5} />
      </div>
    </div>
  );
}
