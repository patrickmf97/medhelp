import type { LicenseClassification } from './types';

type Rule = {
  pattern: RegExp;
  license: LicenseClassification['license'];
  excluded: boolean;
  reason: string;
};

// Order matters only in that these are mutually exclusive in practice (checked against the real
// scene graph — see docs/atlas/provenance.md). Each pattern matches the structure's own name;
// callers are responsible for propagating the resulting classification down to descendants that
// do not repeat the name (e.g. "Cochlea" under "Internal ear").
const RULES: Rule[] = [
  {
    pattern: /inner ear|internal ear/i,
    license: 'cc-by-nc-sa-4.0',
    excluded: true,
    reason:
      '"Anatomy of the Inner Ear" (University of Dundee School of Medicine) is CC BY-NC-SA 4.0 — non-commercial only, excluded from the commercial product.',
  },
  {
    pattern: /kidney/i,
    license: 'cc-by-nc-4.0',
    excluded: true,
    reason: '"Kidney" (Lissie Cowley) is CC BY-NC 4.0 — non-commercial only, excluded from the commercial product.',
  },
  {
    pattern: /cranial nerve/i,
    license: 'cc-by-4.0',
    excluded: false,
    reason:
      '"Cranial Nerves and Foramina" (University of Dundee, CAHID) is CC BY 4.0 — commercial-safe, attribution only.',
  },
];

/**
 * Checks a single structure's own name against the known non-default license exclusions.
 * Returns null when the structure has no special license of its own (it should inherit its
 * license from its nearest ancestor, or the CC BY-SA 4.0 default if none applies).
 */
export function classifySelfLicense(name: string): LicenseClassification | null {
  for (const rule of RULES) {
    if (rule.pattern.test(name)) {
      return { license: rule.license, excluded: rule.excluded, reason: rule.reason };
    }
  }
  return null;
}
