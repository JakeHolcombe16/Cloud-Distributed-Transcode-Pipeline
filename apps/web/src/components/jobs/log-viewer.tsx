"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Search, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import type { Job } from "@/lib/types";
import { formatTime } from "@/lib/utils";

interface LogViewerProps {
  job: Job;
}

// Generate mock logs based on job status and timestamps
function generateLogs(job: Job): { time: string; message: string }[] {
  const logs: { time: string; message: string }[] = [];
  const createdAt = new Date(job.createdAt);

  logs.push({
    time: formatTime(job.createdAt),
    message: `Job ${job.id} created`,
  });

  if (job.status !== "pending") {
    const processingTime = new Date(createdAt.getTime() + 1000);
    logs.push({
      time: formatTime(processingTime.toISOString()),
      message: `Downloading input file: ${job.inputKey}`,
    });

    logs.push({
      time: formatTime(new Date(processingTime.getTime() + 2000).toISOString()),
      message: "Input file downloaded successfully",
    });

    for (const rendition of job.renditions) {
      const startTime = new Date(processingTime.getTime() + 3000);
      logs.push({
        time: formatTime(startTime.toISOString()),
        message: `Starting transcode to ${rendition.resolution}...`,
      });

      if (rendition.outputKey) {
        logs.push({
          time: formatTime(new Date(startTime.getTime() + 10000).toISOString()),
          message: `Completed ${rendition.resolution} transcode`,
        });
        logs.push({
          time: formatTime(new Date(startTime.getTime() + 11000).toISOString()),
          message: `Uploading ${rendition.resolution} to storage...`,
        });
        logs.push({
          time: formatTime(new Date(startTime.getTime() + 12000).toISOString()),
          message: `Uploaded ${rendition.resolution}: ${rendition.outputKey}`,
        });
      }
    }

    if (job.status === "completed") {
      logs.push({
        time: formatTime(job.updatedAt),
        message: "Job completed successfully",
      });
    } else if (job.status === "failed") {
      logs.push({
        time: formatTime(job.updatedAt),
        message: `Job failed: ${job.errorMessage || "Unknown error"}`,
      });
    }
  }

  return logs;
}

export function LogViewer({ job }: LogViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [followTail, setFollowTail] = useState(true);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const logs = generateLogs(job);
  const filteredLogs = searchQuery
    ? logs.filter((log) =>
        log.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs;

  // Auto-scroll to bottom when following tail
  useEffect(() => {
    if (followTail && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs.length, followTail]);

  const copyLogs = () => {
    const logText = logs.map((log) => `[${log.time}] ${log.message}`).join("\n");
    navigator.clipboard.writeText(logText);
    toast.success("Logs copied to clipboard");
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Logs</CardTitle>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 pl-8 text-xs"
            />
          </div>

          {/* Follow tail toggle */}
          <Button
            variant={followTail ? "primary" : "secondary"}
            size="sm"
            onClick={() => setFollowTail(!followTail)}
            className="h-8"
          >
            <ArrowDown className="mr-1 h-3 w-3" />
            Follow
          </Button>

          {/* Copy button */}
          <Button variant="secondary" size="sm" onClick={copyLogs} className="h-8">
            <Copy className="mr-1 h-3 w-3" />
            Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={logsContainerRef}
          className="h-64 overflow-auto bg-[var(--bg-primary)] font-mono text-xs"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
              {searchQuery ? "No matching logs" : "No logs yet"}
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className="flex gap-3 rounded px-2 py-1 hover:bg-[var(--bg-tertiary)]"
                >
                  <span className="text-[var(--text-tertiary)] shrink-0">
                    [{log.time}]
                  </span>
                  <span
                    className={
                      log.message.includes("failed") || log.message.includes("error")
                        ? "text-[var(--status-failed)]"
                        : log.message.includes("completed") || log.message.includes("successfully")
                        ? "text-[var(--status-completed)]"
                        : "text-[var(--text-primary)]"
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
