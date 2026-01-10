import { checkRateLimit, RateLimitError } from "./rate-limiter";

// API base URLs - configured via environment variables
const REST_API_URL = process.env.NEXT_PUBLIC_REST_API_URL || "http://localhost:8080";
const GRAPHQL_API_URL = process.env.NEXT_PUBLIC_GRAPHQL_API_URL || "http://localhost:8081/query";

export { REST_API_URL, GRAPHQL_API_URL };

/**
 * API error with status code and message
 */
export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
  }
}

/**
 * Generic fetch wrapper with error handling and rate limiting
 */
export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // Check client-side rate limit
  checkRateLimit();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Handle rate limit from server
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
    throw new RateLimitError(
      "Server rate limit exceeded. Please try again later.",
      retryAfter * 1000
    );
  }

  // Handle other errors
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new ApiError(response.status, response.statusText, errorText);
  }

  // Handle empty responses
  const contentType = response.headers.get("Content-Type");
  if (!contentType || !contentType.includes("application/json")) {
    return {} as T;
  }

  return response.json();
}

/**
 * REST API methods
 */
export const restApi = {
  get: <T>(endpoint: string) =>
    apiFetch<T>(`${REST_API_URL}${endpoint}`),

  post: <T>(endpoint: string, data: unknown) =>
    apiFetch<T>(`${REST_API_URL}${endpoint}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
