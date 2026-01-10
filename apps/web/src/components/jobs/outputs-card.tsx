"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle2, Clock } from "lucide-react";
import { getDownloadUrl } from "@/lib/api/rest";
import { toast } from "sonner";
import type { Rendition } from "@/lib/types";

interface OutputsCardProps {
  renditions: Rendition[];
}

export function OutputsCard({ renditions }: OutputsCardProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (rendition: Rendition) => {
    if (!rendition.outputKey) return;

    try {
      setDownloading(rendition.id);
      const { url } = await getDownloadUrl(rendition.outputKey);
      
      // Open download URL in new tab
      window.open(url, "_blank");
      toast.success(`Downloading ${rendition.resolution}`);
    } catch {
      toast.error(`Failed to get download URL for ${rendition.resolution}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outputs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {renditions.map((rendition) => {
            const isReady = !!rendition.outputKey;
            const isDownloading = downloading === rendition.id;

            return (
              <div
                key={rendition.id}
                className="flex items-center justify-between rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3"
              >
                <div className="flex items-center gap-3">
                  {isReady ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--status-completed)]" />
                  ) : (
                    <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />
                  )}
                  <div>
                    <span className="font-medium text-[var(--text-primary)]">
                      {rendition.resolution}
                    </span>
                    {rendition.outputKey && (
                      <p className="text-xs text-[var(--text-tertiary)] font-mono truncate max-w-48">
                        {rendition.outputKey.split("/").pop()}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload(rendition)}
                  disabled={!isReady || isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-3 w-3" />
                  )}
                  Download
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
