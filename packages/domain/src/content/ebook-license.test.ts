import { describe, expect, it } from 'vitest';

import { validateEbookLicense } from './ebook-license';

const valid = {
  author: 'Henry Gray',
  source: 'Gray\'s Anatomy, 20th edition (1918)',
  licenseType: 'dominio_publico',
  licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
};

describe('validateEbookLicense', () => {
  it('accepts complete rights metadata', () => {
    expect(validateEbookLicense(valid)).toEqual({ ok: true, errors: [] });
  });

  it('rejects a missing author', () => {
    const result = validateEbookLicense({ ...valid, author: '' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Autor é obrigatório.');
  });

  it('rejects a missing source', () => {
    const result = validateEbookLicense({ ...valid, source: '   ' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Fonte é obrigatória.');
  });

  it('rejects a missing or unknown license type', () => {
    expect(validateEbookLicense({ ...valid, licenseType: '' }).ok).toBe(false);
    expect(validateEbookLicense({ ...valid, licenseType: 'livre' }).errors).toContain(
      'Tipo de licença é obrigatório.',
    );
  });

  it('rejects an empty license URL, matching the approved plan example', () => {
    const result = validateEbookLicense({ ...valid, licenseType: 'dominio_publico', licenseUrl: '' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('URL da licença é obrigatória.');
  });

  it('rejects a non-https license URL', () => {
    const result = validateEbookLicense({ ...valid, licenseUrl: 'http://example.com/licenca' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('URL da licença deve ser um endereço https:// válido.');
  });

  it('rejects a malformed license URL', () => {
    const result = validateEbookLicense({ ...valid, licenseUrl: 'não é url' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('URL da licença deve ser um endereço https:// válido.');
  });

  it('reports every missing field at once', () => {
    const result = validateEbookLicense({ author: '', source: '', licenseType: '', licenseUrl: '' });
    expect(result.errors).toHaveLength(4);
  });
});
