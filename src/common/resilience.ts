/**
 * Shared handling for flaky upstream calls (Gmail, OpenAI): which failures are
 * worth retrying, the backoff between attempts, and request timeouts.
 */

/** Per-request ceilings. axios has none by default, so a stalled call would hang forever. */
export const HTTP_TIMEOUT_MS = {
  gmail: 30_000,
  google_oauth: 15_000,
  llm: 60_000,
} as const;

const NETWORK_ERROR_CODES = new Set([
  'ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'EAI_AGAIN', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND',
]);

// Google signals per-user / per-project rate limits with a 403 (not only 429)
// carrying one of these reasons. `dailyLimitExceeded` is deliberately absent:
// it won't clear within seconds, so retrying would only waste time.
const RATE_LIMIT_REASONS = new Set(['rateLimitExceeded', 'userRateLimitExceeded']);

interface HttpErrorLike {
  code?: string;
  response?: { status?: number; data?: any; headers?: Record<string, unknown> };
}

/** 429, or a 403 whose body names a rate-limit reason. Waiting (and later retrying) is the right response. */
export function isRateLimited(err: unknown): boolean {
  const res = (err as HttpErrorLike)?.response;
  if (!res) return false;
  if (res.status === 429) return true;
  if (res.status === 403) {
    const reasons: unknown[] = res.data?.error?.errors?.map((e: { reason?: unknown }) => e?.reason) ?? [];
    return reasons.some((r) => typeof r === 'string' && RATE_LIMIT_REASONS.has(r));
  }
  return false;
}

/** Failures that say nothing about the request itself: rate limits, timeouts, dropped connections, 5xx. */
export function isTransientHttpError(err: unknown): boolean {
  const e = err as HttpErrorLike;
  if (isRateLimited(err)) return true;
  const status = e?.response?.status;
  if (status !== undefined) return status === 408 || status >= 500;
  return typeof e?.code === 'string' && NETWORK_ERROR_CODES.has(e.code);
}

export interface BackoffOptions {
  /** Total tries, including the first. */
  attempts?: number;
  baseMs?: number;
  /** Google's "maximum_backoff": the delay never exceeds this. */
  maxMs?: number;
  isRetryable?: (err: unknown) => boolean;
  /** Called before each wait with the failed attempt number (1-based) and the delay. */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Truncated exponential backoff as Google documents it:
 * wait min(2^n seconds + random milliseconds, maximum_backoff) between tries.
 * A 429's Retry-After wins when it asks for longer, still within the cap.
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, options: BackoffOptions = {}): Promise<T> {
  const {
    attempts = 5,
    baseMs = 1000,
    maxMs = 16_000,
    isRetryable = isTransientHttpError,
    onRetry,
    sleep = defaultSleep,
    random = Math.random,
  } = options;

  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !isRetryable(err)) throw err;
      const computed = baseMs * 2 ** (attempt - 1) + Math.floor(random() * 1000);
      const delayMs = Math.min(Math.max(computed, retryAfterMs(err) ?? 0), maxMs);
      onRetry?.(err, attempt, delayMs);
      await sleep(delayMs);
    }
  }
}

function retryAfterMs(err: unknown): number | undefined {
  const raw = (err as HttpErrorLike)?.response?.headers?.['retry-after'];
  const seconds = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN;
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}
