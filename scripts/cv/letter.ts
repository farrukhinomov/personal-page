/**
 * Builds a cover letter as DOCX and PDF in the CV's design.
 *
 * Usage: pnpm letter _docs/letters/<company>.json
 *
 * The JSON follows `letterSchema` (src/cv/letter.ts). Letters belong to one application
 * each and stay in `_docs/`, outside git. The DOCX and PDF are written next to the JSON;
 * Word exports the PDF (needs Windows, Word and PowerShell 7).
 */
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { letterSchema, renderLetterDocx } from '@/cv/letter';
import { loadFont } from './assets';

const [input] = process.argv.slice(2);
if (!input?.endsWith('.json')) {
  throw new Error('Usage: pnpm letter <path to letter .json>');
}

const source = resolve(input);
const letter = letterSchema.parse(JSON.parse(await readFile(source, 'utf8')));
const docx = source.replace(/\.json$/, '.docx');
await writeFile(docx, await renderLetterDocx(letter, await loadFont()));
process.stdout.write(`wrote ${docx}\n`);

execFileSync('pwsh', ['-NoProfile', '-File', join(import.meta.dirname, 'export-pdf.ps1'), docx], {
  stdio: 'inherit',
});
