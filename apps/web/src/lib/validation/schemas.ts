import { z } from "zod";

// Allowed video file extensions (matching backend)
export const ALLOWED_EXTENSIONS = [
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
  ".m4v",
  ".wmv",
  ".flv",
] as const;

// Allowed MIME types for video files
export const ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "video/x-m4v",
  "video/x-ms-wmv",
  "video/x-flv",
] as const;

// Maximum file size (5GB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

// Maximum filename length
export const MAX_FILENAME_LENGTH = 255;

// Safe filename regex (matching backend)
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

/**
 * Validate filename for upload
 */
export const filenameSchema = z
  .string()
  .min(1, "Filename is required")
  .max(MAX_FILENAME_LENGTH, `Filename must be at most ${MAX_FILENAME_LENGTH} characters`)
  .regex(SAFE_FILENAME_REGEX, "Filename contains invalid characters (only letters, numbers, dots, dashes, and underscores allowed)")
  .refine(
    (filename) => {
      const ext = filename.toLowerCase().split(".").pop();
      return ext && ALLOWED_EXTENSIONS.some((allowed) => allowed === `.${ext}`);
    },
    {
      message: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
    }
  );

/**
 * Validate file for upload
 */
export const uploadFileSchema = z.object({
  name: filenameSchema,
  size: z
    .number()
    .min(1, "File is empty")
    .max(MAX_FILE_SIZE, `File size must be at most 5GB`),
  type: z.string().refine(
    (type) => {
      // Allow empty type (some browsers don't set it)
      if (!type) return true;
      return ALLOWED_MIME_TYPES.some((allowed) => type.startsWith(allowed.split("/")[0]));
    },
    {
      message: "Invalid file type. Please upload a video file.",
    }
  ),
});

/**
 * Validate job ID (UUID format)
 */
export const jobIdSchema = z
  .string()
  .uuid("Invalid job ID format");

/**
 * Validate search query
 */
export const searchQuerySchema = z
  .string()
  .max(100, "Search query is too long")
  .transform((val) => val.trim());

/**
 * Sanitize filename for safe storage
 * Removes path components and special characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.split(/[/\\]/).pop() || filename;
  
  // Replace unsafe characters with underscore
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, "_");
  
  // Limit length
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = sanitized.split(".").pop() || "";
    const name = sanitized.slice(0, MAX_FILENAME_LENGTH - ext.length - 1);
    return `${name}.${ext}`;
  }
  
  return sanitized;
}

/**
 * Validate a file before upload
 * Returns validation result with error messages
 */
export function validateUploadFile(file: File): {
  valid: boolean;
  errors: string[];
} {
  const result = uploadFileSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.issues.map((issue) => issue.message);
  return { valid: false, errors };
}
