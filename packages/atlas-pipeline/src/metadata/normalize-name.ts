/**
 * Normalizes a raw Blender collection/object name for matching purposes:
 *  - strips a leading "N: " system-index prefix (e.g. "1: Skeletal system")
 *  - strips a trailing Z-Anatomy grouping apostrophe (e.g. "Abdominal aorta'")
 *  - trims and collapses internal whitespace
 *  - lowercases (accents are preserved; only ASCII case folding is applied)
 */
export function normalizeName(raw: string): string {
  return raw
    .replace(/^\d+:\s*/, '')
    .replace(/'+$/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Builds a stable, filesystem/id-safe slug from a full ancestor path of names. Used as the
 * deterministic basis for structure ids, so it must never depend on anything but the path text.
 */
export function slugify(path: string[]): string {
  return path
    .map((segment) =>
      stripAccents(normalizeName(segment))
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .join('/');
}
