/**
 * Rate Limiter for API Calls
 * Prevents hitting GHL API rate limits by queuing and throttling requests
 */

interface QueuedRequest {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class RateLimiter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();

  // Configuration
  private readonly minDelay = 100; // Min 100ms between requests
  private readonly maxRequestsPerSecond = 10; // Max 10 requests per second
  private readonly maxRequestsPerMinute = 100; // Max 100 requests per minute

  constructor(
    private config?: {
      minDelay?: number;
      maxRequestsPerSecond?: number;
      maxRequestsPerMinute?: number;
    }
  ) {
    if (config?.minDelay) this.minDelay = config.minDelay;
    if (config?.maxRequestsPerSecond) this.maxRequestsPerSecond = config.maxRequestsPerSecond;
    if (config?.maxRequestsPerMinute) this.maxRequestsPerMinute = config.maxRequestsPerMinute;
  }

  /**
   * Add a request to the queue
   */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queued requests with rate limiting
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Reset counter if window expired (1 minute)
      const now = Date.now();
      if (now - this.windowStart >= 60000) {
        this.windowStart = now;
        this.requestCount = 0;
      }

      // Check if we've hit the per-minute limit
      if (this.requestCount >= this.maxRequestsPerMinute) {
        const waitTime = 60000 - (now - this.windowStart);
        console.log(`[RateLimiter] Hit per-minute limit, waiting ${waitTime}ms`);
        await this.delay(waitTime);
        this.windowStart = Date.now();
        this.requestCount = 0;
      }

      // Check if we need to wait for per-second limit
      const timeSinceLastRequest = now - this.lastRequestTime;
      const minTimeBetweenRequests = 1000 / this.maxRequestsPerSecond;

      if (timeSinceLastRequest < minTimeBetweenRequests) {
        await this.delay(minTimeBetweenRequests - timeSinceLastRequest);
      }

      // Also enforce absolute minimum delay
      if (timeSinceLastRequest < this.minDelay) {
        await this.delay(this.minDelay - timeSinceLastRequest);
      }

      const request = this.queue.shift();
      if (!request) break;

      try {
        this.lastRequestTime = Date.now();
        this.requestCount++;

        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Wait for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue = [];
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter({
  minDelay: 100,
  maxRequestsPerSecond: 8, // Conservative limit
  maxRequestsPerMinute: 80, // Conservative limit
});

/**
 * Wrap a fetch call with rate limiting
 */
export async function rateLimitedFetch(
  url: string | URL | Request,
  options?: RequestInit
): Promise<Response> {
  return globalRateLimiter.schedule(() => fetch(url, options));
}

/**
 * Batch multiple API calls with rate limiting
 */
export async function batchFetch<T>(
  requests: Array<() => Promise<T>>,
  options?: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<T[]> {
  const concurrency = options?.concurrency || 3;
  const results: T[] = [];
  let completed = 0;

  // Process requests in batches
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(request => globalRateLimiter.schedule(request))
    );
    results.push(...batchResults);

    completed += batch.length;
    options?.onProgress?.(completed, requests.length);
  }

  return results;
}
