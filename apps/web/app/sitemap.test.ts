import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listPublicCatalog } from '@/lib/content/public-catalog';
import sitemap from './sitemap';

vi.mock('@/lib/content/public-catalog', () => ({ listPublicCatalog: vi.fn() }));

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

describe('sitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://medhelp.example';
  });

  afterEach(() => {
    if (ORIGINAL_SITE_URL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  });

  it('always lists the static legal and catalog pages', async () => {
    vi.mocked(listPublicCatalog).mockResolvedValue([]);
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        'https://medhelp.example/',
        'https://medhelp.example/explorar',
        'https://medhelp.example/termos',
        'https://medhelp.example/privacidade',
        'https://medhelp.example/creditos-e-licencas',
        'https://medhelp.example/contato',
      ]),
    );
  });

  it('includes a detail URL for every free published lesson, but not premium ones', async () => {
    vi.mocked(listPublicCatalog).mockResolvedValue([
      { id: 'free-1', title: 'Aula gratuita', slug: 'aula-gratuita', summary: null, accessLevel: 'free', module: 'M', discipline: 'D', cycle: 'C', cycleSlug: 'c' },
      { id: 'premium-1', title: 'Aula premium', slug: 'aula-premium', summary: null, accessLevel: 'premium', module: 'M', discipline: 'D', cycle: 'C', cycleSlug: 'c' },
    ]);

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://medhelp.example/explorar/aula/free-1');
    expect(urls).not.toContain('https://medhelp.example/explorar/aula/premium-1');
  });

  it('falls back to the static routes when the catalog cannot be loaded', async () => {
    vi.mocked(listPublicCatalog).mockRejectedValue(new Error('database unavailable'));
    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((entry) => entry.url.includes('/explorar/aula/'))).toBe(false);
  });
});
