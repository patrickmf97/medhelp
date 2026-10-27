import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireRole, verifyUploadReceipt } = vi.hoisted(() => ({
  requireRole: vi.fn(),
  verifyUploadReceipt: vi.fn(),
}));
vi.mock('@/lib/auth/require-role', () => ({ requireRole }));
vi.mock('@/lib/storage/media-upload', () => ({ verifyUploadReceipt }));

import { createEbook, transitionEbook } from './ebook-repository';

const actorId = 'a2b7be83-8b52-4e98-b0cb-96f2526992b2';
const metadata = {
  title: 'Atlas de Anatomia',
  slug: 'atlas-de-anatomia',
  author: 'Henry Gray',
  description: null,
  source: 'Gray\'s Anatomy (1918)',
  licenseType: 'dominio_publico',
  licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
  accessLevel: 'free' as const,
  position: 0,
};
const file = {
  objectKey: `content/${actorId}/atlas.pdf`,
  mimeType: 'application/pdf',
  size: 2_000_000,
  receipt: 'payload.signature',
};

beforeEach(() => {
  vi.resetAllMocks();
  delete process.env.R2_SECRET_ACCESS_KEY;
});

describe('createEbook', () => {
  it('rejects a storage object key that was not scoped to the authenticated editor', async () => {
    requireRole.mockResolvedValue({ supabase: {}, user: { id: actorId } });
    await expect(
      createEbook(metadata, { ...file, objectKey: 'content/someone-else/atlas.pdf' }),
    ).rejects.toThrow('Arquivo de ebook inválido.');
    expect(verifyUploadReceipt).not.toHaveBeenCalled();
  });

  it('requires R2 storage to be configured before accepting the upload receipt', async () => {
    requireRole.mockResolvedValue({ supabase: {}, user: { id: actorId } });
    await expect(createEbook(metadata, file)).rejects.toThrow('Armazenamento de mídia não configurado.');
  });

  it('inserts a draft ebook once the signed receipt checks out', async () => {
    process.env.R2_SECRET_ACCESS_KEY = 'secret';
    const inserted = { id: 'ebook-1', ...metadata, file_object_key: file.objectKey };
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: inserted, error: null })) })) }));
    requireRole.mockResolvedValue({ supabase: { from: vi.fn(() => ({ insert })) }, user: { id: actorId } });

    const result = await createEbook(metadata, file);

    expect(verifyUploadReceipt).toHaveBeenCalledWith(
      file.receipt,
      { objectKey: file.objectKey, mimeType: file.mimeType, size: file.size },
      'secret',
    );
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      title: metadata.title,
      file_object_key: file.objectKey,
      created_by: actorId,
      updated_by: actorId,
    }));
    expect(result).toEqual(inserted);
  });
});

describe('transitionEbook', () => {
  function mockCurrent(row: Record<string, unknown>) {
    const select = vi.fn(() => ({ eq: vi.fn(() => ({ is: vi.fn(() => ({ single: vi.fn(async () => ({ data: row, error: null })) })) })) }));
    return select;
  }

  it('blocks publishing an ebook with incomplete rights metadata before it ever reaches the database write', async () => {
    const select = mockCurrent({ id: 'ebook-1', status: 'review', author: '', source: '', license_type: null, license_url: null });
    const update = vi.fn();
    requireRole.mockResolvedValue({ supabase: { from: vi.fn(() => ({ select, update })) }, user: { id: actorId } });

    await expect(transitionEbook('ebook-1', 'published')).rejects.toThrow(
      /Não é possível publicar sem metadados de direitos completos/,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('publishes once rights metadata is complete', async () => {
    const row = { id: 'ebook-1', status: 'review', author: 'Henry Gray', source: 'Fonte', license_type: 'dominio_publico', license_url: 'https://example.com/licenca' };
    const select = mockCurrent(row);
    const updated = { ...row, status: 'published' };
    const update = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: updated, error: null })) })) })) }));
    requireRole.mockResolvedValue({ supabase: { from: vi.fn(() => ({ select, update })) }, user: { id: actorId } });

    const result = await transitionEbook('ebook-1', 'published');
    expect(update).toHaveBeenCalledWith({ status: 'published', updated_by: actorId });
    expect(result).toEqual(updated);
  });

  it('rejects an invalid state transition before touching rights metadata', async () => {
    const select = mockCurrent({ id: 'ebook-1', status: 'draft', author: '', source: '', license_type: null, license_url: null });
    requireRole.mockResolvedValue({ supabase: { from: vi.fn(() => ({ select })) }, user: { id: actorId } });

    await expect(transitionEbook('ebook-1', 'published')).rejects.toThrow(
      'Invalid content transition: draft → published',
    );
  });
});
