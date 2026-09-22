import { describe, expect, it } from 'vitest';

import {
  createUploadReceipt,
  prepareMediaUpload,
  signR2Upload,
  verifyUploadReceipt,
} from './media-upload';

describe('prepareMediaUpload', () => {
  it('creates a private, actor-scoped object key for an allowed PDF', () => {
    const upload = prepareMediaUpload({
      actorId: 'a2b7be83-8b52-4e98-b0cb-96f2526992b2',
      fileName: 'Resumo de Cardio.pdf',
      mimeType: 'application/pdf',
      size: 2_000_000,
    });

    expect(upload.objectKey).toMatch(
      /^content\/a2b7be83-8b52-4e98-b0cb-96f2526992b2\/[a-f0-9-]+-resumo-de-cardio\.pdf$/,
    );
    expect(upload.maxAgeSeconds).toBe(900);
  });

  it('rejects executable and SVG payloads', () => {
    expect(() =>
      prepareMediaUpload({
        actorId: 'actor',
        fileName: 'conteudo.svg',
        mimeType: 'image/svg+xml',
        size: 1_000,
      }),
    ).toThrow('Unsupported media type');
  });

  it('rejects files above the MIME-specific limit', () => {
    expect(() =>
      prepareMediaUpload({
        actorId: 'actor',
        fileName: 'aula.mp4',
        mimeType: 'video/mp4',
        size: 501 * 1024 * 1024,
      }),
    ).toThrow('File exceeds the 500 MB limit');
  });

  it('rejects empty files and unsafe file names', () => {
    expect(() =>
      prepareMediaUpload({
        actorId: 'actor',
        fileName: '../secreto.pdf',
        mimeType: 'application/pdf',
        size: 0,
      }),
    ).toThrow('File cannot be empty');
  });

  it('signs a short-lived R2 PUT restricted to the declared content type', () => {
    const signed = signR2Upload(
      {
        objectKey: 'content/actor/file.pdf',
        mimeType: 'application/pdf',
        size: 100,
        maxAgeSeconds: 900,
      },
      {
        accountId: 'account',
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
        bucketName: 'private-media',
      },
      new Date('2026-09-22T12:00:00.000Z'),
    );
    const url = new URL(signed.uploadUrl);

    expect(url.hostname).toBe('account.r2.cloudflarestorage.com');
    expect(url.pathname).toBe('/private-media/content/actor/file.pdf');
    expect(url.searchParams.get('X-Amz-Content-Sha256')).toBe('UNSIGNED-PAYLOAD');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('binds registration metadata to a signed, expiring upload receipt', () => {
    const upload = { objectKey: 'content/actor/file.pdf', mimeType: 'application/pdf', size: 100, maxAgeSeconds: 900 };
    const receipt = createUploadReceipt(upload, '2026-09-22T12:15:00.000Z', 'secret');
    const expected = { objectKey: upload.objectKey, mimeType: upload.mimeType, size: upload.size };

    expect(() => verifyUploadReceipt(receipt, expected, 'secret', new Date('2026-09-22T12:10:00.000Z'))).not.toThrow();
    expect(() => verifyUploadReceipt(receipt, { ...expected, size: 101 }, 'secret', new Date('2026-09-22T12:10:00.000Z'))).toThrow('Invalid upload receipt');
    expect(() => verifyUploadReceipt(receipt, expected, 'secret', new Date('2026-09-22T12:16:00.000Z'))).toThrow('Invalid upload receipt');
  });
});
