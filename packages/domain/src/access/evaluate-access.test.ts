import { describe, expect, it } from 'vitest';
import { evaluateAccess } from './evaluate-access';

const now = new Date('2026-09-24T12:00:00.000Z');

describe('evaluateAccess', () => {
  it.each([
    ['active', 'active'],
    ['grace', 'grace_period'],
    ['canceled', 'paid_period'],
  ] as const)('allows a valid %s subscription', (state, reason) => {
    expect(evaluateAccess({ state, accessUntil: '2026-09-25T00:00:00.000Z' }, now)).toEqual({
      canAccessPremium: true,
      reason,
    });
  });

  it.each(['active', 'grace', 'canceled'] as const)(
    'fails closed when %s has no valid future access date',
    (state) => {
      expect(evaluateAccess({ state, accessUntil: null }, now)).toEqual({
        canAccessPremium: false,
        reason: 'expired',
      });
      expect(evaluateAccess({ state, accessUntil: 'not-a-date' }, now)).toEqual({
        canAccessPremium: false,
        reason: 'expired',
      });
      expect(evaluateAccess({ state, accessUntil: now.toISOString() }, now)).toEqual({
        canAccessPremium: false,
        reason: 'expired',
      });
    },
  );

  it('keeps pending access blocked', () => {
    expect(evaluateAccess({ state: 'pending', accessUntil: null }, now)).toEqual({
      canAccessPremium: false,
      reason: 'pending',
    });
  });

  it('blocks expired and refunded subscriptions', () => {
    expect(evaluateAccess({ state: 'expired', accessUntil: '2026-10-01T00:00:00Z' }, now)).toEqual({
      canAccessPremium: false,
      reason: 'expired',
    });
    expect(evaluateAccess({ state: 'refunded', accessUntil: '2026-10-01T00:00:00Z' }, now)).toEqual({
      canAccessPremium: false,
      reason: 'refunded',
    });
  });
});
