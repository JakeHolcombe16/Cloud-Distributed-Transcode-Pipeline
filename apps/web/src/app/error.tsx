"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-failed-bg)]">
        <AlertTriangle className="h-8 w-8 text-[var(--status-failed)]" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold text-[var(--text-primary)]">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-center text-sm text-[var(--text-secondary)]">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-[var(--text-tertiary)]">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Link href="/dashboard">
          <Button>
            <Home className="mr-2 h-4 w-4" />
            Go home
          </Button>
        </Link>
      </div>
    </div>
  );
}
