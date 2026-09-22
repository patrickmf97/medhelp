import type { AccessDecision, AccessInput } from './types';

function hasFutureAccess(accessUntil: string | null, now: Date): boolean {
  if (accessUntil === null) return false;

  const accessUntilMs = Date.parse(accessUntil);
  const nowMs = now.getTime();
  return Number.isFinite(accessUntilMs) && Number.isFinite(nowMs) && accessUntilMs > nowMs;
}

export function evaluateAccess(input: AccessInput, now: Date): AccessDecision {
  switch (input.state) {
    case 'pending':
      return { canAccessPremium: false, reason: 'pending' };
    case 'expired':
      return { canAccessPremium: false, reason: 'expired' };
    case 'refunded':
      return { canAccessPremium: false, reason: 'refunded' };
    case 'active':
      return hasFutureAccess(input.accessUntil, now)
        ? { canAccessPremium: true, reason: 'active' }
        : { canAccessPremium: false, reason: 'expired' };
    case 'grace':
      return hasFutureAccess(input.accessUntil, now)
        ? { canAccessPremium: true, reason: 'grace_period' }
        : { canAccessPremium: false, reason: 'expired' };
    case 'canceled':
      return hasFutureAccess(input.accessUntil, now)
        ? { canAccessPremium: true, reason: 'paid_period' }
        : { canAccessPremium: false, reason: 'expired' };
  }
}
