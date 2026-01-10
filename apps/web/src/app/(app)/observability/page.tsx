"use client";

import { MetricsGrid } from "@/components/metrics/metrics-grid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

// Default Grafana URL - can be configured via environment
const GRAFANA_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || "http://localhost:3001";
const GRAFANA_DASHBOARD_PATH = "/d/transcode-pipeline/transcode-pipeline";

export default function ObservabilityPage() {
  const grafanaDashboardUrl = `${GRAFANA_URL}${GRAFANA_DASHBOARD_PATH}?orgId=1&refresh=5s`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Observability
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Monitor system metrics and pipeline health
          </p>
        </div>
        <a
          href={grafanaDashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="secondary">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Grafana
          </Button>
        </a>
      </div>

      {/* Quick Metrics */}
      <MetricsGrid />

      {/* Grafana Embed */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative h-[600px] w-full overflow-hidden rounded-b-lg bg-[var(--bg-primary)]">
            <iframe
              src={`${grafanaDashboardUrl}&kiosk`}
              className="h-full w-full border-0"
              title="Grafana Dashboard"
            />
            {/* Fallback message */}
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]" style={{ zIndex: -1 }}>
              <div className="text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  Unable to load Grafana dashboard
                </p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Make sure Grafana is running at {GRAFANA_URL}
                </p>
                <a
                  href={grafanaDashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block"
                >
                  <Button variant="primary" size="sm">
                    Open in new tab
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <a
              href={`${GRAFANA_URL}/explore`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-sm"
            >
              <span className="font-medium text-[var(--text-primary)]">
                Grafana Explore
              </span>
              <ExternalLink className="h-4 w-4 text-[var(--text-tertiary)]" />
            </a>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Query raw metrics with PromQL
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <a
              href="http://localhost:9090"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-sm"
            >
              <span className="font-medium text-[var(--text-primary)]">
                Prometheus
              </span>
              <ExternalLink className="h-4 w-4 text-[var(--text-tertiary)]" />
            </a>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Direct access to metrics storage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <a
              href="http://localhost:9001"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-sm"
            >
              <span className="font-medium text-[var(--text-primary)]">
                MinIO Console
              </span>
              <ExternalLink className="h-4 w-4 text-[var(--text-tertiary)]" />
            </a>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Object storage management
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
