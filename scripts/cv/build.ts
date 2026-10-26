/**
 * Builds the CV as DOCX and PDF, in German and English, in two editions:
 *
 *   web          published on the site: city only, no phone number
 *   application  sent by hand: street address and phone number
 *
 * Usage: pnpm cv
 *
 * Reads the phone number from `_docs/cv-private.json` ({ "phone": "+49 …" }) and the photo
 * from `_docs/avatar.jpg`; both stay out of git. Writes to `_docs/cv/<edition>/`.
 * The PDFs are exported by Microsoft Word (scripts/cv/export-pdf.ps1), so they look exactly
 * like the DOCX files. That step needs Windows, Word and PowerShell 7 (`pwsh`).
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { z } from 'astro/zod';
import { buildCvModel, type CvEdition } from '@/cv/model';
import { renderCvDocx, type DocxAssets } from '@/cv/render-docx';
import { LOCALES, type Locale } from '@/i18n/locales';

const ROOT = resolve(import.meta.dirname, '../..');
const PRIVATE_DIR = join(ROOT, '_docs');
const OUT_DIR = join(PRIVATE_DIR, 'cv');
const EDITIONS: readonly CvEdition[] = ['web', 'application'];
const FILE_NAME: Record<Locale, string> = {
  de: 'Farrukh-Inomov-Lebenslauf',
  en: 'Farrukh-Inomov-CV',
};

/** Photo edge in pixels (30 mm at ~340 dpi) and corner radius relative to the edge. */
const PHOTO_PX = 400;
const PHOTO_RADIUS = 0.08;

const privateSchema = z.object({
  phone: z.string().regex(/^\+\d[\d ]{6,}$/, 'international format, e.g. "+49 152 …"'),
});

async function readPrivate() {
  const path = join(PRIVATE_DIR, 'cv-private.json');
  const raw = await readFile(path, 'utf8').catch(() => {
    throw new Error(`Missing ${path}. Create it with {"phone": "+49 …"}.`);
  });
  return privateSchema.parse(JSON.parse(raw));
}

async function roundedPhoto(): Promise<Buffer> {
  const radius = Math.round(PHOTO_PX * PHOTO_RADIUS);
  const mask = Buffer.from(
    `<svg width="${PHOTO_PX}" height="${PHOTO_PX}"><rect width="100%" height="100%" rx="${radius}" ry="${radius}"/></svg>`,
  );
  return sharp(join(PRIVATE_DIR, 'avatar.jpg'))
    .resize(PHOTO_PX, PHOTO_PX, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function loadAssets(): Promise<DocxAssets> {
  // A direct devDependency; the package does not export its font files.
  const fonts = join(ROOT, 'node_modules/geist/dist/fonts/geist-sans');
  const [photo, regular, bold] = await Promise.all([
    roundedPhoto(),
    readFile(join(fonts, 'Geist-Regular.ttf')),
    readFile(join(fonts, 'Geist-Bold.ttf')),
  ]);
  return { photo, font: { name: 'Geist', regular, bold } };
}

async function main() {
  const { phone } = await readPrivate();
  const assets = await loadAssets();

  for (const edition of EDITIONS) {
    const dir = join(OUT_DIR, edition);
    await mkdir(dir, { recursive: true });
    for (const locale of LOCALES) {
      const model = buildCvModel(locale, { edition, ...(edition === 'application' && { phone }) });
      const path = join(dir, `${FILE_NAME[locale]}.docx`);
      await writeFile(path, await renderCvDocx(model, assets));
      process.stdout.write(`wrote ${path}\n`);
    }
  }

  execFileSync(
    'pwsh',
    ['-NoProfile', '-File', join(import.meta.dirname, 'export-pdf.ps1'), OUT_DIR],
    { stdio: 'inherit' },
  );
}

await main();
