/**
 * Token bucket rate limiter for client-side request throttling.
 * Prevents spam before hitting backend rate limits.
 */
class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(maxTokens: number = 10, refillPerSecond: number = 2) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = refillPerSecond / 1000;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Check if a request can proceed and consume a token
   */
  tryConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Get current token count (for debugging)
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get time until next token is available (in ms)
   */
  getWaitTime(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }
}

// Global rate limiter instance
// 10 tokens max, refills at 2 tokens per second
// This allows bursts of 10 requests, then sustained 2 req/s
const globalRateLimiter = new TokenBucketRateLimiter(10, 2);

/**
 * Rate limit error thrown when client-side limit is exceeded
 */
export class RateLimitError extends Error {
  readonly retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Check rate limit before making a request
 * Throws RateLimitError if limit exceeded
 */
export function checkRateLimit(): void {
  if (!globalRateLimiter.tryConsume()) {
    const waitTime = globalRateLimiter.getWaitTime();
    throw new RateLimitError(
      `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
      waitTime
    );
  }
}

/**
 * Get rate limiter status for UI display
 */
export function getRateLimitStatus() {
  return {
    tokens: globalRateLimiter.getTokens(),
    waitTime: globalRateLimiter.getWaitTime(),
  };
}
