import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "pending" | "processing" | "completed" | "failed";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
  pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending)]",
  processing: "bg-[var(--status-processing-bg)] text-[var(--status-processing)]",
  completed: "bg-[var(--status-completed-bg)] text-[var(--status-completed)]",
  failed: "bg-[var(--status-failed-bg)] text-[var(--status-failed)]",
};

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
