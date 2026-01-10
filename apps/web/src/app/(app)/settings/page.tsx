"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Configure your transcode pipeline settings
        </p>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)]">
              REST API URL
            </label>
            <Input
              value={process.env.NEXT_PUBLIC_REST_API_URL || "http://localhost:8080"}
              disabled
              className="mt-1"
            />
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Configure via NEXT_PUBLIC_REST_API_URL environment variable
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)]">
              GraphQL API URL
            </label>
            <Input
              value={process.env.NEXT_PUBLIC_GRAPHQL_API_URL || "http://localhost:8081/query"}
              disabled
              className="mt-1"
            />
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Configure via NEXT_PUBLIC_GRAPHQL_API_URL environment variable
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "REST API", url: "http://localhost:8080/health", port: 8080 },
              { name: "GraphQL API", url: "http://localhost:8081/query", port: 8081 },
              { name: "Prometheus", url: "http://localhost:9090", port: 9090 },
              { name: "Grafana", url: "http://localhost:3001", port: 3001 },
              { name: "MinIO", url: "http://localhost:9001", port: 9001 },
            ].map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3"
              >
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {service.name}
                  </span>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Port {service.port}
                  </p>
                </div>
                <a
                  href={service.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Version</span>
              <span className="text-[var(--text-primary)]">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Environment</span>
              <span className="text-[var(--text-primary)]">
                {process.env.NODE_ENV || "development"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
