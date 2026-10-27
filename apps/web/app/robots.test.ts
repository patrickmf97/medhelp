import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import robots from './robots';

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

describe('robots', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (ORIGINAL_SITE_URL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  });

  it('allows the public site by default and blocks authenticated areas', () => {
    const result = robots();
    expect(result.rules).toEqual(
      expect.objectContaining({
        userAgent: '*',
        allow: '/',
        disallow: expect.arrayContaining(['/aluno', '/admin', '/editor', '/auth', '/entrar', '/cadastro']),
      }),
    );
  });

  it('points the sitemap field at the configured site origin', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://medhelp.example';
    expect(robots().sitemap).toBe('https://medhelp.example/sitemap.xml');
  });

  it('falls back to localhost when no site URL is configured', () => {
    expect(robots().sitemap).toBe('http://localhost:3000/sitemap.xml');
  });
});
