export const APP_ROLES = ['student', 'editor', 'admin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const SUBSCRIPTION_STATES = [
  'pending',
  'active',
  'grace',
  'expired',
  'canceled',
  'refunded',
] as const;

export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number];

export type AccessInput = {
  state: SubscriptionState;
  accessUntil: string | null;
};

export type AccessDecision = {
  canAccessPremium: boolean;
  reason: 'active' | 'grace_period' | 'paid_period' | 'pending' | 'expired' | 'refunded';
};
