import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { legal } from '@/data/legal';
import { LOCALES, type Locale } from '@/i18n/locales';
import { buildCvModel, type CvOptions } from './model';
import { cvPath } from './paths';
import { renderCvDocx } from './render-docx';
import { renderCvPdf } from './render-pdf';

const OCT_2026 = new Date('2026-10-26T12:00:00Z');
const PHONE = '+49 151 0000 0000';
const WEB: CvOptions = { edition: 'web', now: OCT_2026 };
const APPLICATION: CvOptions = { edition: 'application', phone: PHONE, now: OCT_2026 };
const everything = (locale: Locale, options: CvOptions) =>
  JSON.stringify(buildCvModel(locale, options));

describe('CV model', () => {
  it('publishes neither a phone number nor the street in the web edition', () => {
    for (const locale of LOCALES) {
      expect(everything(locale, WEB)).not.toMatch(/\+\d|\d{10,}/);
      expect(everything(locale, WEB)).not.toContain(legal.street);
    }
  });

  it('adds phone and street address to the application edition', () => {
    for (const locale of LOCALES) {
      const contact = buildCvModel(locale, APPLICATION).contact;
      expect(contact[0]?.text).toBe(`${legal.street}, ${legal.postalCode} ${legal.city}`);
      expect(contact).toContainEqual({ text: PHONE, url: 'tel:+4915100000000' });
    }
  });

  it('refuses a phone number in the web edition and none in the application edition', () => {
    expect(() => buildCvModel('de', { ...WEB, phone: PHONE })).toThrow(/web edition/);
    expect(() => buildCvModel('de', { edition: 'application' })).toThrow(/phone number/);
  });

  it('has the same sections in both languages', () => {
    const shape = (locale: Locale) =>
      buildCvModel(locale, WEB).sections.map((section) => section.entries.length);
    expect(shape('de')).toEqual(shape('en'));
  });

  it('leads with the role and describes KRITIS GRC with its demo', () => {
    const cv = buildCvModel('en', WEB);
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
    const experience = buildCvModel('de', WEB).sections.find(
      (section) => section.heading === 'Berufserfahrung',
    );
    const detailed = experience?.entries.filter((entry) => entry.bullets).map((e) => e.subtitle);
    expect(detailed).toEqual(['INTEX EDV-Software GmbH', 'Silk Road Professionals Tajikistan']);
  });

  it('states the driving licence and nothing about residence status', () => {
    expect(everything('de', APPLICATION)).toContain('Klasse B');
    expect(everything('en', APPLICATION)).toContain('Class B');
    expect(everything('de', APPLICATION)).not.toMatch(/Aufenthalt/);
    expect(everything('en', APPLICATION)).not.toMatch(/residence|permit/i);
  });

  it('dates the footer in the reader’s language', () => {
    expect(buildCvModel('de', WEB).footer).toContain('26. Oktober 2026');
    expect(buildCvModel('en', WEB).footer).toContain('October 26, 2026');
  });
});

describe('CV DOCX', () => {
  it('renders a Word document with the font embedded', async () => {
    const fonts = 'node_modules/geist/dist/fonts/geist-sans';
    const docx = await renderCvDocx(buildCvModel('de', APPLICATION), {
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

describe('CV PDF', () => {
  it('renders a valid, multi-page A4 PDF in each language', async () => {
    for (const locale of LOCALES) {
      const pdf = await renderCvPdf(buildCvModel(locale, WEB));
      const raw = pdf.toString('latin1');
      expect(raw.startsWith('%PDF-')).toBe(true);
      expect(raw.trimEnd().endsWith('%%EOF')).toBe(true);
      const pages = raw.match(/\/Type \/Page\b/g)?.length ?? 0;
      expect(pages).toBeGreaterThanOrEqual(1);
      expect(pages).toBeLessThanOrEqual(4);
      expect(raw).toContain('/MediaBox [0 0 595.28 841.89]');
    }
  }, 30_000);

  it('is served at a stable path per language', () => {
    expect(cvPath('de')).toBe('/cv/farrukh-inomov-lebenslauf.pdf');
    expect(cvPath('en')).toBe('/cv/farrukh-inomov-cv.pdf');
  });
});
