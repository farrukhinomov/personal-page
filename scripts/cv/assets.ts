import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { EmbeddedFont } from '@/cv/docx-style';

export const ROOT = resolve(import.meta.dirname, '../..');

/** Geist, as on the site. A direct devDependency; the package does not export its font files. */
export async function loadFont(): Promise<EmbeddedFont> {
  const fonts = join(ROOT, 'node_modules/geist/dist/fonts/geist-sans');
  const [regular, bold] = await Promise.all([
    readFile(join(fonts, 'Geist-Regular.ttf')),
    readFile(join(fonts, 'Geist-Bold.ttf')),
  ]);
  return { name: 'Geist', regular, bold };
}
