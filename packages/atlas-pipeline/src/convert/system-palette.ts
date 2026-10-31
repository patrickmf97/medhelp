/**
 * Synthetic per-system anatomical color palette, assigned at GLB-conversion time.
 *
 * The real Z-Anatomy Blender source (`Startup.blend`) was never going to give us real per-object
 * material colors here: a headless Blender script that walked `object.material_slots[*].material`
 * node trees to read the real Principled BSDF Base Color hung indefinitely (reproduced 3x, no
 * resource pressure — a genuine hang tied to touching material node trees in that scene, not a
 * timing issue), and the original OBJ export (`export_batch_v2.py`) only ever captured vertex
 * positions/normals/faces, never material/color data, so there is no real color to recover from
 * the committed export either. Real per-object color is not available; this is a deliberate,
 * reasonable substitute, not an attempt to reconstruct it.
 *
 * Keyed by the manifest's real `groupKey` strings (see package/group-assets.ts's
 * `groupKeyForPath` — these are the exact real Z-Anatomy top-level system/region names, with
 * their numeric prefixes, that a real built manifest.json contains). One color per system, not
 * per mesh, so recoloring a system later is a one-line change here, not a scattered edit.
 */
export const SYSTEM_PALETTE: Record<string, string> = {
  '1: Skeletal system': '#E8DCC4',
  '2: Muscular insertions': '#9C3B3B',
  '3: Joints': '#B8C4D0',
  '4: Muscular system': '#9C3B3B',
  '5: Cardiovascular system': '#B5293F',
  '6: Lymphoid organs': '#A8C978',
  '7: Nervous system & Sense organs': '#E8D878',
  '8: Visceral systems': '#D4967A',
  '9: Regions of human body': '#E3B392',
  'Reference lines, reference planes, movements': '#999999',
  unmapped: '#999999',
};

/** Neutral gray fallback for any real groupKey this palette doesn't (yet) have an entry for. */
export const DEFAULT_SYSTEM_COLOR = '#999999';

/** Looks up the synthetic base color for a real manifest groupKey, falling back to the neutral
 * default for an unrecognized or missing groupKey rather than throwing. */
export function colorForGroupKey(groupKey: string | undefined): string {
  if (groupKey === undefined) return DEFAULT_SYSTEM_COLOR;
  return SYSTEM_PALETTE[groupKey] ?? DEFAULT_SYSTEM_COLOR;
}

/**
 * Converts an sRGB hex color (e.g. "#E8DCC4") to the linear RGB triple glTF's
 * `baseColorFactor` expects (the glTF spec defines material factors in linear space, while hex
 * colors like this palette's are authored in sRGB, the space humans actually pick colors in).
 */
export function hexToLinearRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) {
    throw new Error(`Invalid hex color: "${hex}"`);
  }
  const value = match[1]!;
  const srgbToLinear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = srgbToLinear(parseInt(value.slice(0, 2), 16));
  const g = srgbToLinear(parseInt(value.slice(2, 4), 16));
  const b = srgbToLinear(parseInt(value.slice(4, 6), 16));
  return [r, g, b];
}
