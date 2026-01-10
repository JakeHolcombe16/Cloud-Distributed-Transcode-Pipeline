import { type HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--bg-tertiary)] ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({ className = "", ...props }: SkeletonProps) {
  return <Skeleton className={`h-4 w-full ${className}`} {...props} />;
}

export function SkeletonCard({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 ${className}`}
      {...props}
    >
      <Skeleton className="mb-2 h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 border-b border-[var(--border-default)] pb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
