import { describe, expect, it } from 'vitest';
import { legal } from '@/data/legal';
import { LOCALES } from '@/i18n/locales';
import { buildCvModel } from './model';
import { cvPath } from './paths';
import { renderCvPdf } from './render-pdf';

const OCT_2026 = new Date('2026-10-26T12:00:00Z');
const everything = (locale: 'de' | 'en') => JSON.stringify(buildCvModel(locale, OCT_2026));

describe('CV model', () => {
  it('never contains a phone number or the street address', () => {
    for (const locale of LOCALES) {
      expect(everything(locale)).not.toMatch(/\+\d|\d{10,}/);
      expect(everything(locale)).not.toContain(legal.street);
    }
  });

  it('has the same sections in both languages', () => {
    const headings = (locale: 'de' | 'en') =>
      buildCvModel(locale, OCT_2026).sections.map((section) => section.entries.length);
    expect(headings('de')).toEqual(headings('en'));
  });

  it('leads with role, contact and the flagship project', () => {
    const cv = buildCvModel('en', OCT_2026);
    expect(cv.role).toBe('Senior Full-Stack Software Engineer');
    expect(cv.contact).toContain('inomov.online');
    const projects = cv.sections.find((section) => section.heading === 'Projects');
    expect(projects?.entries[0]?.title).toMatch(/^KRITIS GRC/);
  });

  it('marks private repositories instead of linking them', () => {
    const projects = buildCvModel('de', OCT_2026).sections.find((s) => s.heading === 'Projekte');
    const flowpro = projects?.entries.find((entry) => entry.title.startsWith('FlowPro'));
    expect(flowpro?.meta).toContain('Quellcode auf Anfrage');
  });

  it('dates the footer in the reader’s language', () => {
    expect(buildCvModel('de', OCT_2026).footer).toContain('26. Oktober 2026');
    expect(buildCvModel('en', OCT_2026).footer).toContain('October 26, 2026');
  });
});

describe('CV PDF', () => {
  it('renders a valid, multi-page A4 PDF in each language', async () => {
    for (const locale of LOCALES) {
      const pdf = await renderCvPdf(buildCvModel(locale, OCT_2026));
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
