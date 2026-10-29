import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { loginAction, recoverPasswordAction, resetPasswordAction, signUpAction } from './actions';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }) }));
vi.mock('@/lib/security/rate-limit', () => ({ enforceRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 1, retryAfterMs: 0 }) }));

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe('authentication actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockResolvedValue({ allowed: true, remaining: 1, retryAfterMs: 0 });
  });

  it('returns a generic login error', async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: new Error('user not found') }) } } as never);
    const result = await loginAction(undefined, form({ email: 'nobody@medhelp.test', password: '1234567890', next: '/aluno' }));
    expect(result?.message).toBe('Não foi possível entrar. Confira seus dados e tente novamente.');
  });

  it('does not reveal whether a recovery email exists', async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({ error: new Error('not found') }) } } as never);
    const result = await recoverPasswordAction(undefined, form({ email: 'nobody@medhelp.test' }));
    expect(result?.message).toMatch(/^Se existir uma conta/);
  });

  it('records versioned legal acceptance in signup metadata', async () => {
    const signUp = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({ auth: { signUp } } as never);
    await signUpAction(undefined, form({ name: 'Maria Silva', email: 'maria@medhelp.test', password: 'senha-segura', accepted: 'on' }));
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ options: { data: expect.objectContaining({ terms_version: '2026-09-22', privacy_version: '2026-09-22' }), emailRedirectTo: expect.stringContaining('/auth/callback?next=%2Faluno') } }));
  });
});

describe('rate limiting on sensitive auth actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks login attempts once throttled, without touching Supabase', async () => {
    const signInWithPassword = vi.fn();
    vi.mocked(createClient).mockResolvedValue({ auth: { signInWithPassword } } as never);
    vi.mocked(enforceRateLimit).mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 30_000 });

    const result = await loginAction(undefined, form({ email: 'nobody@medhelp.test', password: '1234567890' }));

    expect(result?.message).toMatch(/Muitas tentativas/);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('blocks signup attempts once throttled, without touching Supabase', async () => {
    const signUp = vi.fn();
    vi.mocked(createClient).mockResolvedValue({ auth: { signUp } } as never);
    vi.mocked(enforceRateLimit).mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 30_000 });

    const result = await signUpAction(undefined, form({ name: 'Maria Silva', email: 'maria@medhelp.test', password: 'senha-segura', accepted: 'on' }));

    expect(result?.message).toMatch(/Muitas tentativas/);
    expect(signUp).not.toHaveBeenCalled();
  });

  it('keeps the anti-enumeration message for recovery even when throttled', async () => {
    const resetPasswordForEmail = vi.fn();
    vi.mocked(createClient).mockResolvedValue({ auth: { resetPasswordForEmail } } as never);
    vi.mocked(enforceRateLimit).mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 30_000 });

    const result = await recoverPasswordAction(undefined, form({ email: 'nobody@medhelp.test' }));

    expect(result?.message).toMatch(/^Se existir uma conta/);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('blocks password reset attempts once throttled, without touching Supabase', async () => {
    const updateUser = vi.fn();
    vi.mocked(createClient).mockResolvedValue({ auth: { updateUser } } as never);
    vi.mocked(enforceRateLimit).mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 30_000 });

    const result = await resetPasswordAction(undefined, form({ password: 'nova-senha-segura' }));

    expect(result?.message).toMatch(/Muitas tentativas/);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
