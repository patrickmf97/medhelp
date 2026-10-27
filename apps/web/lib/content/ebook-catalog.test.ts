import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSignedDownload } = vi.hoisted(() => ({ createSignedDownload: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/storage/signed-files', () => ({ createSignedDownload }));

import { createClient } from '@/lib/supabase/server';
import { listEbookCatalog, requestEbookDownload } from './ebook-catalog';

describe('listEbookCatalog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps released ebook rows and drops malformed ones', async () => {
    const rows = [
      {
        id: 'ebook-1', title: 'Atlas', slug: 'atlas', author: 'Gray', description: null,
        source: 'Domínio público', license_type: 'dominio_publico', license_url: 'https://example.com/licenca',
        access_level: 'free', published_at: '2026-01-01T00:00:00.000Z',
      },
      { id: 'broken', title: null, slug: 'broken', author: 'x', source: 'y', access_level: 'free' },
    ];
    const secondOrder = vi.fn(() => Promise.resolve({ data: rows, error: null }));
    const firstOrder = vi.fn(() => ({ order: secondOrder }));
    const isCall = vi.fn(() => ({ order: firstOrder }));
    const selectCall = vi.fn(() => ({ is: isCall }));
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => ({ select: selectCall })) } as never);

    const result = await listEbookCatalog();
    expect(result).toEqual([
      {
        id: 'ebook-1', title: 'Atlas', slug: 'atlas', author: 'Gray', description: null,
        source: 'Domínio público', licenseType: 'dominio_publico', licenseUrl: 'https://example.com/licenca',
        accessLevel: 'free', publishedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('surfaces a safe error when the query fails', async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ is: vi.fn(() => ({ order: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'boom' } })) })) })) })),
      })),
    } as never);

    await expect(listEbookCatalog()).rejects.toThrow('Não foi possível carregar a biblioteca.');
  });
});

describe('requestEbookDownload', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it('refuses to sign a download when the ebook row is not visible (not found or not entitled)', async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ is: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })) })) })) })),
    } as never);

    await expect(requestEbookDownload('missing')).rejects.toThrow('Este ebook não está disponível para download.');
    expect(createSignedDownload).not.toHaveBeenCalled();
  });

  it('refuses when R2 storage is not configured', async () => {
    delete process.env.R2_ACCOUNT_ID;
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ is: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { title: 'Atlas', file_object_key: 'content/a/atlas.pdf', mime_type: 'application/pdf' }, error: null })) })) })) })) })),
    } as never);

    await expect(requestEbookDownload('ebook-1')).rejects.toThrow('Armazenamento de mídia não configurado.');
  });

  it('signs a download for a visible ebook using its storage key and a friendly filename', async () => {
    process.env.R2_ACCOUNT_ID = 'account';
    process.env.R2_ACCESS_KEY_ID = 'access';
    process.env.R2_SECRET_ACCESS_KEY = 'secret';
    process.env.R2_BUCKET_NAME = 'bucket';
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ is: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { title: 'Atlas de Anatomia', file_object_key: 'content/a/atlas.pdf', mime_type: 'application/pdf' }, error: null })) })) })) })) })),
    } as never);
    createSignedDownload.mockReturnValue({ downloadUrl: 'https://signed', expiresAt: '2026-01-01T00:05:00.000Z' });

    const result = await requestEbookDownload('ebook-1');
    expect(createSignedDownload).toHaveBeenCalledWith(
      'content/a/atlas.pdf',
      'Atlas de Anatomia.pdf',
      { accountId: 'account', accessKeyId: 'access', secretAccessKey: 'secret', bucketName: 'bucket' },
    );
    expect(result).toEqual({ downloadUrl: 'https://signed', expiresAt: '2026-01-01T00:05:00.000Z' });
  });
});
