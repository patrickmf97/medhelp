import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { loginAction, recoverPasswordAction, signUpAction } from './actions';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }) }));

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe('authentication actions', () => {
  beforeEach(() => vi.clearAllMocks());

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
