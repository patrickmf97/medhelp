import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { requireRole, safeRedirectPath } from './require-role';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }) }));

const user = { id: '10000000-0000-0000-0000-000000000001', email: 'user@medhelp.test' };

function mockClient(roles: string[]) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: roles.map((role) => ({ role })), error: null }),
      })),
    })),
  } as never);
}

describe('requireRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows an administrator into the admin shell', async () => {
    mockClient(['student', 'admin']);
    await expect(requireRole(['admin'])).resolves.toMatchObject({ user, roles: ['student', 'admin'] });
  });

  it('forbids an editor from billing administration', async () => {
    mockClient(['student', 'editor']);
    await expect(requireRole(['admin'])).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/acesso-negado');
  });
});

describe('safeRedirectPath', () => {
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/%5C%5Cevil.test', 'javascript:alert(1)'])(
    'rejects unsafe destination %s',
    (destination) => expect(safeRedirectPath(destination, '/aluno')).toBe('/aluno'),
  );

  it('keeps a local destination', () => {
    expect(safeRedirectPath('/aluno?aba=hoje', '/')).toBe('/aluno?aba=hoje');
  });
});
