"use client";

import { useCallback, useState } from "react";
import { Upload, File, X, AlertCircle } from "lucide-react";
import { validateUploadFile, ALLOWED_EXTENSIONS } from "@/lib/validation/schemas";
import { formatBytes } from "@/lib/utils";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFileSelect, disabled }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const validation = validateUploadFile(file);
      if (!validation.valid) {
        setError(validation.errors.join(", "));
        setSelectedFile(null);
        return;
      }

      setError(null);
      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          disabled
            ? "cursor-not-allowed border-[var(--border-default)] bg-[var(--bg-tertiary)] opacity-50"
            : isDragActive
            ? "border-[var(--accent)] bg-[var(--accent-muted)]"
            : "cursor-pointer border-[var(--border-default)] hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)]"
        }`}
      >
        <input
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={handleInputChange}
          disabled={disabled}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              isDragActive
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            }`}
          >
            <Upload className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {isDragActive ? "Drop your video here" : "Drag & drop video file here"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              or click to browse
            </p>
          </div>

          <p className="text-xs text-[var(--text-tertiary)]">
            {ALLOWED_EXTENSIONS.join(", ").toUpperCase()} (max 5GB)
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-[var(--status-failed-bg)] p-3">
          <AlertCircle className="h-4 w-4 text-[var(--status-failed)]" />
          <p className="text-sm text-[var(--status-failed)]">{error}</p>
        </div>
      )}

      {/* Selected file */}
      {selectedFile && !error && (
        <div className="flex items-center justify-between rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--bg-tertiary)]">
              <File className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {selectedFile.name}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {formatBytes(selectedFile.size)}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={clearFile}
              className="rounded-md p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
