import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

/**
 * Geist as raw WOFF files for build-time renderers (Open Graph images, the CV PDF).
 * Those libraries cannot read the woff2 files the website serves.
 */
export type FontWeight = 400 | 600;

const require = createRequire(import.meta.url);
const cache = new Map<FontWeight, Promise<Buffer>>();

export function loadGeist(weight: FontWeight): Promise<Buffer> {
  let font = cache.get(weight);
  if (!font) {
    font = readFile(require.resolve(`@fontsource/geist/files/geist-latin-${weight}-normal.woff`));
    cache.set(weight, font);
  }
  return font;
}
