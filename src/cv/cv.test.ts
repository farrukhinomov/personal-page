import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { legal } from '@/data/legal';
import { LOCALES, type Locale } from '@/i18n/locales';
import { buildCvModel, type CvOptions } from './model';
import { cvPath } from './paths';
import { renderCvDocx } from './render-docx';

const OCT_2026 = new Date('2026-10-26T12:00:00Z');
const OPTIONS: CvOptions = { now: OCT_2026 };
const everything = (locale: Locale) => JSON.stringify(buildCvModel(locale, OPTIONS));

describe('CV model', () => {
  it('publishes neither a phone number nor the street address', () => {
    for (const locale of LOCALES) {
      expect(everything(locale)).not.toMatch(/\+\d|\d{10,}|tel:/);
      expect(everything(locale)).not.toContain(legal.street);
    }
  });

  it('has the same sections in both languages', () => {
    const shape = (locale: Locale) =>
      buildCvModel(locale, OPTIONS).sections.map((section) => section.entries.length);
    expect(shape('de')).toEqual(shape('en'));
  });

  it('leads with the role and describes KRITIS GRC with its demo', () => {
    const cv = buildCvModel('en', OPTIONS);
    expect(cv.role).toBe('Senior Full-Stack Software Engineer');
    const project = cv.sections.find((section) => section.heading === 'Project');
    expect(project?.entries).toHaveLength(1);
    expect(project?.entries[0]?.title).toMatch(/^KRITIS GRC/);
    expect(project?.entries[0]?.links?.map((link) => link.url)).toEqual([
      'https://grc.inomov.online',
      'https://github.com/farrukhinomov/kritis-grc',
    ]);
  });

  it('details recent engineering roles and keeps older positions to one paragraph', () => {
    const experience = buildCvModel('de', OPTIONS).sections.find(
      (section) => section.heading === 'Berufserfahrung',
    );
    const detailed = experience?.entries.filter((entry) => entry.bullets).map((e) => e.subtitle);
    expect(detailed).toEqual(['INTEX EDV-Software GmbH', 'Silk Road Professionals Tajikistan']);
  });

  it('states the driving licence and nothing about residence status', () => {
    expect(everything('de')).toContain('Klasse B');
    expect(everything('en')).toContain('Class B');
    expect(everything('de')).not.toMatch(/Aufenthalt/);
    expect(everything('en')).not.toMatch(/residence|permit/i);
  });

  it('dates the footer in the reader’s language', () => {
    expect(buildCvModel('de', OPTIONS).footer).toContain('26. Oktober 2026');
    expect(buildCvModel('en', OPTIONS).footer).toContain('October 26, 2026');
  });
});

describe('CV DOCX', () => {
  it('renders a Word document with the font embedded', async () => {
    const fonts = 'node_modules/geist/dist/fonts/geist-sans';
    const docx = await renderCvDocx(buildCvModel('de', OPTIONS), {
      photo: await sharp({
        create: { width: 8, height: 8, channels: 3, background: '#ffffff' },
      })
        .png()
        .toBuffer(),
      font: {
        name: 'Geist',
        regular: readFileSync(`${fonts}/Geist-Regular.ttf`),
        bold: readFileSync(`${fonts}/Geist-Bold.ttf`),
      },
    });
    const raw = docx.toString('latin1');
    expect(raw.startsWith('PK')).toBe(true);
    expect(raw).toContain('word/document.xml');
    expect(raw).toMatch(/word\/fonts\/[^"]+\.odttf/);
  }, 30_000);
});

describe('CV PDF on the site', () => {
  it('serves A4 PDFs without a phone link that link to the demo', () => {
    for (const locale of LOCALES) {
      const raw = readFileSync(`public${cvPath(locale)}`).toString('latin1');
      expect(raw.startsWith('%PDF-')).toBe(true);
      expect(raw).toMatch(/\/MediaBox\s*\[\s*0 0 595\.\d+ 841\.\d+\]/);
      const links = [...raw.matchAll(/\/URI\s*\(([^)]*)\)/g)].map((match) => match[1]);
      expect(links).toContain('https://grc.inomov.online/');
      expect(links.some((link) => link?.startsWith('tel:'))).toBe(false);
    }
  });

  it('is served at a stable path per language', () => {
    expect(cvPath('de')).toBe('/cv/farrukh-inomov-lebenslauf.pdf');
    expect(cvPath('en')).toBe('/cv/farrukh-inomov-cv.pdf');
  });
});
