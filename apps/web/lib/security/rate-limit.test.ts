import { beforeEach, describe, expect, it, vi } from 'vitest';
import { headers } from 'next/headers';

import { checkRateLimit, enforceRateLimit, getClientIdentifier, resetRateLimitStore } from './rate-limit';

vi.mock('next/headers', () => ({ headers: vi.fn() }));

function headersWith(entries: Record<string, string>) {
  return new Headers(entries);
}

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimitStore());

  it('allows requests up to the configured limit within the window', () => {
    const rule = { limit: 3, windowMs: 1000 };
    const now = 0;
    expect(checkRateLimit('key', rule, now).allowed).toBe(true);
    expect(checkRateLimit('key', rule, now).allowed).toBe(true);
    expect(checkRateLimit('key', rule, now).allowed).toBe(true);
  });

  it('blocks once the limit is exceeded within the same window', () => {
    const rule = { limit: 2, windowMs: 1000 };
    const now = 0;
    checkRateLimit('blocked-key', rule, now);
    checkRateLimit('blocked-key', rule, now);
    const result = checkRateLimit('blocked-key', rule, now);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets the counter once the window elapses', () => {
    const rule = { limit: 1, windowMs: 1000 };
    checkRateLimit('resetting-key', rule, 0);
    const stillBlocked = checkRateLimit('resetting-key', rule, 500);
    expect(stillBlocked.allowed).toBe(false);

    const afterWindow = checkRateLimit('resetting-key', rule, 1001);
    expect(afterWindow.allowed).toBe(true);
  });

  it('tracks independent buckets per key', () => {
    const rule = { limit: 1, windowMs: 1000 };
    expect(checkRateLimit('ip-a', rule, 0).allowed).toBe(true);
    expect(checkRateLimit('ip-a', rule, 0).allowed).toBe(false);
    expect(checkRateLimit('ip-b', rule, 0).allowed).toBe(true);
  });
});

describe('getClientIdentifier', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the first address in x-forwarded-for', async () => {
    vi.mocked(headers).mockResolvedValue(headersWith({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }) as never);
    await expect(getClientIdentifier()).resolves.toBe('203.0.113.5');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
    vi.mocked(headers).mockResolvedValue(headersWith({ 'x-real-ip': '198.51.100.9' }) as never);
    await expect(getClientIdentifier()).resolves.toBe('198.51.100.9');
  });

  it('falls back to "unknown" when no proxy header is present', async () => {
    vi.mocked(headers).mockResolvedValue(headersWith({}) as never);
    await expect(getClientIdentifier()).resolves.toBe('unknown');
  });
});

describe('enforceRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
  });

  it('scopes the limit by rule name so one scope cannot exhaust another', async () => {
    vi.mocked(headers).mockResolvedValue(headersWith({ 'x-forwarded-for': '203.0.113.5' }) as never);
    for (let i = 0; i < 5; i += 1) await enforceRateLimit('login', 0);
    const loginResult = await enforceRateLimit('login', 0);
    expect(loginResult.allowed).toBe(false);

    const signupResult = await enforceRateLimit('signup', 0);
    expect(signupResult.allowed).toBe(true);
  });

  it('scopes the limit per client identifier', async () => {
    vi.mocked(headers).mockResolvedValue(headersWith({ 'x-forwarded-for': '203.0.113.5' }) as never);
    for (let i = 0; i < 3; i += 1) await enforceRateLimit('signup', 0);
    expect((await enforceRateLimit('signup', 0)).allowed).toBe(false);

    vi.mocked(headers).mockResolvedValue(headersWith({ 'x-forwarded-for': '198.51.100.1' }) as never);
    expect((await enforceRateLimit('signup', 0)).allowed).toBe(true);
  });
});
