import { describe, expect, it } from 'vitest';

import { createSignedDownload } from './signed-files';

const configuration = {
  accountId: 'account',
  accessKeyId: 'access-key',
  secretAccessKey: 'secret-key',
  bucketName: 'private-media',
};

describe('createSignedDownload', () => {
  it('signs a short-lived GET restricted to the requested object and filename', () => {
    const signed = createSignedDownload(
      'content/author/atlas-anatomia.pdf',
      'Atlas de Anatomia.pdf',
      configuration,
      300,
      new Date('2026-09-22T12:00:00.000Z'),
    );
    const url = new URL(signed.downloadUrl);

    expect(url.hostname).toBe('account.r2.cloudflarestorage.com');
    expect(url.pathname).toBe('/private-media/content/author/atlas-anatomia.pdf');
    expect(url.searchParams.get('X-Amz-Content-Sha256')).toBe('UNSIGNED-PAYLOAD');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('host');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('response-content-disposition')).toBe(
      'attachment; filename="Atlas de Anatomia.pdf"',
    );
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/);
    expect(signed.expiresAt).toBe('2026-09-22T12:05:00.000Z');
  });

  it('strips unsafe characters from the suggested filename without touching the object key', () => {
    const signed = createSignedDownload(
      'content/author/manual.pdf',
      'Relatório "confidencial"\\.pdf',
      configuration,
      60,
      new Date('2026-09-22T12:00:00.000Z'),
    );
    const url = new URL(signed.downloadUrl);

    expect(url.pathname).toBe('/private-media/content/author/manual.pdf');
    expect(url.searchParams.get('response-content-disposition')).toBe(
      'attachment; filename="Relatório confidencial.pdf"',
    );
  });

  it('produces a different signature for a different expiry window', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    const short = createSignedDownload('content/author/manual.pdf', 'manual.pdf', configuration, 60, now);
    const long = createSignedDownload('content/author/manual.pdf', 'manual.pdf', configuration, 600, now);

    expect(short.downloadUrl).not.toBe(long.downloadUrl);
  });
});
