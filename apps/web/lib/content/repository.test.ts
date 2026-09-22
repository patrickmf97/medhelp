import { describe, expect, it } from 'vitest';

import { assertAuthorizedActor, publicationTimestamp } from './repository';

describe('content repository guards', () => {
  it('rejects an actor id that differs from the authenticated session', () => {
    expect(() => assertAuthorizedActor('session-user', 'spoofed-user')).toThrow(
      'Unauthorized content mutation',
    );
  });

  it('keeps a future schedule when publishing', () => {
    const scheduledFor = '2026-10-15T12:00:00.000Z';
    expect(publicationTimestamp(scheduledFor, new Date('2026-09-22T12:00:00.000Z'))).toBe(
      scheduledFor,
    );
  });

  it('publishes immediately when the schedule is absent or in the past', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    expect(publicationTimestamp(null, now)).toBe(now.toISOString());
    expect(publicationTimestamp('2026-09-21T12:00:00.000Z', now)).toBe(now.toISOString());
  });
});
