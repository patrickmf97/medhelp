import { describe, expect, it } from 'vitest';

import { normalizeName, slugify } from './normalize-name';

describe('normalizeName', () => {
  it('strips a leading numeric system prefix like "1: "', () => {
    expect(normalizeName('1: Skeletal system')).toBe('skeletal system');
  });

  it('strips a trailing Z-Anatomy grouping apostrophe', () => {
    expect(normalizeName("Abdominal aorta'")).toBe('abdominal aorta');
  });

  it('collapses internal whitespace and trims', () => {
    expect(normalizeName('  Forehead   region  ')).toBe('forehead region');
  });

  it('lowercases accented Portuguese text without altering the accents', () => {
    expect(normalizeName('Coração')).toBe('coração');
  });
});

describe('slugify', () => {
  it('produces a stable, URL/id-safe slug from a path of names', () => {
    expect(slugify(['1: Skeletal system', 'Head', 'Forehead'])).toBe('skeletal-system/head/forehead');
  });

  it('strips accents for the slug while remaining deterministic', () => {
    expect(slugify(['Coração'])).toBe('coracao');
  });

  it('is stable for the same input across repeated calls', () => {
    const path = ['5: Cardiovascular system', "Abdominal aorta'", 'Renal artery'];
    expect(slugify(path)).toBe(slugify(path));
  });
});
