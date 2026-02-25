interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const currentEntry = rateLimitStore.get(key);

  if (!currentEntry || currentEntry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (currentEntry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, currentEntry.resetAt - now),
    };
  }

  currentEntry.count += 1;
  rateLimitStore.set(key, currentEntry);
  return { allowed: true, retryAfterMs: 0 };
}
