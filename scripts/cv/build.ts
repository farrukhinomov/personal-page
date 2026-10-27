/**
 * Builds the CV as DOCX and PDF, in German and English.
 *
 * Usage: pnpm cv
 *
 * Reads the photo from `_docs/avatar.jpg`, which stays out of git, and writes to `_docs/cv/`.
 * The PDFs are exported by Microsoft Word (scripts/cv/export-pdf.ps1), so they look exactly
 * like the DOCX files. That step needs Windows, Word and PowerShell 7 (`pwsh`).
 * Finally the PDFs are copied to `public/cv/`, where the site serves them;
 * commit those after reviewing them.
 */
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { buildCvModel } from '@/cv/model';
import { cvPath } from '@/cv/paths';
import { renderCvDocx, type DocxAssets } from '@/cv/render-docx';
import { LOCALES, type Locale } from '@/i18n/locales';
import { loadFont, ROOT } from './assets';

const PRIVATE_DIR = join(ROOT, '_docs');
const OUT_DIR = join(PRIVATE_DIR, 'cv');
const PUBLIC_DIR = join(ROOT, 'public/cv');
const FILE_NAME: Record<Locale, string> = {
  de: 'Farrukh-Inomov-Lebenslauf',
  en: 'Farrukh-Inomov-CV',
};

/** Photo edge in pixels (30 mm at ~340 dpi) and corner radius relative to the edge. */
const PHOTO_PX = 400;
const PHOTO_RADIUS = 0.08;

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
  const [photo, font] = await Promise.all([roundedPhoto(), loadFont()]);
  return { photo, font };
}

async function main() {
  const assets = await loadAssets();

  await mkdir(OUT_DIR, { recursive: true });
  for (const locale of LOCALES) {
    const path = join(OUT_DIR, `${FILE_NAME[locale]}.docx`);
    await writeFile(path, await renderCvDocx(buildCvModel(locale), assets));
    process.stdout.write(`wrote ${path}\n`);
  }

  execFileSync(
    'pwsh',
    ['-NoProfile', '-File', join(import.meta.dirname, 'export-pdf.ps1'), OUT_DIR],
    { stdio: 'inherit' },
  );

  await mkdir(PUBLIC_DIR, { recursive: true });
  for (const locale of LOCALES) {
    const target = join(ROOT, 'public', cvPath(locale));
    await copyFile(join(OUT_DIR, `${FILE_NAME[locale]}.pdf`), target);
    process.stdout.write(`copied to ${target}\n`);
  }
}

await main();
