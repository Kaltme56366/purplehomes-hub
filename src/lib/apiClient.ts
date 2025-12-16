/**
 * API Client with automatic retry and rate limit handling
 */

import { toast } from 'sonner';

interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const defaultRetryConfig: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Fetch with automatic retry on rate limit (429) errors
 */
export async function fetchWithRetry(
  url: string | URL | Request,
  options?: RequestInit,
  retryConfig?: RetryConfig
): Promise<Response> {
  const config = { ...defaultRetryConfig, ...retryConfig };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If rate limited (429), retry with exponential backoff
      if (response.status === 429) {
        if (attempt < config.maxRetries) {
          const delay = Math.min(
            config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
            config.maxDelay
          );

          console.warn(
            `[API] Rate limited (429), retrying in ${delay}ms... (attempt ${attempt + 1}/${config.maxRetries})`
          );

          // Show toast only on first retry
          if (attempt === 0) {
            toast.info('Server busy, retrying...', { duration: 2000 });
          }

          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          toast.error('Server is experiencing high load. Please try again in a moment.');
          throw new Error('Rate limit exceeded after retries');
        }
      }

      // If other error, don't retry
      if (!response.ok && response.status !== 429) {
        return response;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on network errors unless it's the last attempt
      if (attempt === config.maxRetries) {
        throw lastError;
      }

      const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );

      console.warn(
        `[API] Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${config.maxRetries})`,
        error
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Simple in-memory cache for API responses
 */
class APICache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl,
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  // Clear expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.timestamp) {
        this.cache.delete(key);
      }
    }
  }
}

export const apiCache = new APICache();

// Cleanup expired cache entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => apiCache.cleanup(), 5 * 60 * 1000);
}

/**
 * Fetch with caching
 */
export async function cachedFetch(
  url: string | URL | Request,
  options?: RequestInit & { cacheKey?: string; cacheTTL?: number }
): Promise<Response> {
  const cacheKey = options?.cacheKey || (typeof url === 'string' ? url : url.toString());

  // Check cache first (only for GET requests)
  if (!options?.method || options.method === 'GET') {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      console.log(`[API] Cache hit for ${cacheKey}`);
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Fetch with retry
  const response = await fetchWithRetry(url, options);

  // Cache successful GET responses
  if (
    response.ok &&
    (!options?.method || options.method === 'GET')
  ) {
    const clone = response.clone();
    const data = await clone.json();
    apiCache.set(cacheKey, data, options?.cacheTTL);
  }

  return response;
}
