"use client";

import { Component, type ReactNode } from "react";
import { Button } from "./ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-[var(--status-failed)] bg-[var(--status-failed-bg)] p-6">
          <AlertTriangle className="h-10 w-10 text-[var(--status-failed)]" />
          <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
            Something went wrong
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={this.handleReset}
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
