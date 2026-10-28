import { describe, expect, it } from 'vitest';

import { classifySelfLicense } from './license-rules';

describe('classifySelfLicense', () => {
  it('flags "Internal ear" as the NC-SA inner-ear exclusion', () => {
    const result = classifySelfLicense('Internal ear');
    expect(result).toEqual({
      license: 'cc-by-nc-sa-4.0',
      excluded: true,
      reason: expect.stringContaining('Inner Ear'),
    });
  });

  it('flags "Inner Ear" spelling too, case-insensitively', () => {
    const result = classifySelfLicense('inner ear structures');
    expect(result?.license).toBe('cc-by-nc-sa-4.0');
    expect(result?.excluded).toBe(true);
  });

  it('flags any name containing "kidney" as the NC kidney exclusion', () => {
    const result = classifySelfLicense('Cortex of Kidney lobe');
    expect(result).toEqual({
      license: 'cc-by-nc-4.0',
      excluded: true,
      reason: expect.stringContaining('Kidney'),
    });
  });

  it('flags "Cranial nerves" as CC BY 4.0, but NOT excluded', () => {
    const result = classifySelfLicense('Cranial nerves');
    expect(result).toEqual({
      license: 'cc-by-4.0',
      excluded: false,
      reason: expect.stringContaining('Cranial Nerves and Foramina'),
    });
  });

  it('returns null for an ordinary structure name with no special license', () => {
    expect(classifySelfLicense('Heart')).toBeNull();
    expect(classifySelfLicense('Renal artery')).toBeNull();
    expect(classifySelfLicense('Forehead')).toBeNull();
  });

  it('does not false-positive on unrelated "foramen" structures', () => {
    expect(classifySelfLicense('Foramen magnum')).toBeNull();
    expect(classifySelfLicense('Obturator foramen')).toBeNull();
  });
});
