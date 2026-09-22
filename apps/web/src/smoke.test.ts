import { describe, expect, it } from 'vitest';
import { siteConfig } from './site-config';

describe('siteConfig', () => {
  it('exposes the approved product identity', () => {
    expect(siteConfig.name).toBe('MEDHELP');
    expect(siteConfig.monthlyPriceCents).toBe(3000);
    expect(siteConfig.headline).toBe('Medicina é difícil. Estudar não precisa ser.');
  });
});
