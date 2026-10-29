import { headers } from 'next/headers';

/**
 * Simple in-memory fixed-window rate limiter keyed by IP + scope.
 *
 * This has no external infrastructure dependency, which is appropriate for a
 * single-region deployment. It is a best-effort control: a serverless
 * deployment with multiple concurrent instances keeps one counter per
 * instance, so the effective limit can be higher than configured under
 * heavy concurrent load. See docs/operations/observability.md for notes on
 * upgrading to a shared store (e.g. Redis/Upstash) if that becomes a problem.
 */

export interface RateLimitRule {
  /** Maximum number of allowed attempts within the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the window resets. Zero when the request was allowed. */
  retryAfterMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Sensitive, unauthenticated routes that accept user input and must be throttled.
 * `contato` is currently a static placeholder page with no server action (see
 * apps/web/app/(public)/[document]/page.tsx); add a `contact` rule here and call
 * `enforceRateLimit('contact', ...)` from its action once that form exists.
 */
export const RATE_LIMIT_RULES = {
  login: { limit: 5, windowMs: 60_000 },
  signup: { limit: 3, windowMs: 60_000 },
  passwordRecovery: { limit: 3, windowMs: 60_000 },
  passwordReset: { limit: 5, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitScope = keyof typeof RATE_LIMIT_RULES;

const buckets = new Map<string, Bucket>();

/** Avoid unbounded memory growth from distinct IPs hitting unique scopes. */
const PRUNE_THRESHOLD = 5000;

function pruneExpired(now: number): void {
  if (buckets.size < PRUNE_THRESHOLD) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Pure, fully testable rate-limit check against the shared in-memory store. */
export function checkRateLimit(key: string, rule: RateLimitRule, now: number = Date.now()): RateLimitResult {
  pruneExpired(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, remaining: rule.limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= rule.limit) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, remaining: rule.limit - bucket.count, retryAfterMs: 0 };
}

/** Test-only escape hatch so suites don't leak state between cases. */
export function resetRateLimitStore(): void {
  buckets.clear();
}

/** Resolves the caller's IP from standard proxy headers set by Vercel/the platform. */
export async function getClientIdentifier(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  if (forwardedFor) {
    const [first] = forwardedFor.split(',');
    if (first?.trim()) return first.trim();
  }
  const realIp = headerList.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();
  return 'unknown';
}

/** Convenience wrapper for server actions: resolves the caller's IP and checks the named rule. */
export async function enforceRateLimit(scope: RateLimitScope, now: number = Date.now()): Promise<RateLimitResult> {
  const identifier = await getClientIdentifier();
  return checkRateLimit(`${scope}:${identifier}`, RATE_LIMIT_RULES[scope], now);
}
