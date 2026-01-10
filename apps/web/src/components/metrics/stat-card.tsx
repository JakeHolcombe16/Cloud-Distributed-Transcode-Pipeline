import { type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

export function StatCard({ label, value, icon, trend, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="mt-2 h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </span>
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-[var(--text-primary)]">
            {value}
          </span>
          {trend && (
            <span
              className={`text-xs font-medium ${
                trend.isPositive
                  ? "text-[var(--status-completed)]"
                  : "text-[var(--status-failed)]"
              }`}
            >
              {trend.isPositive ? "+" : "-"}
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
