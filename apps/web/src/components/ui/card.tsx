import { type HTMLAttributes, type ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-[var(--shadow-sm)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ className = "", children, ...props }: CardHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export function CardTitle({ className = "", children, ...props }: CardTitleProps) {
  return (
    <h3
      className={`text-sm font-medium text-[var(--text-primary)] ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({ className = "", children, ...props }: CardContentProps) {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
