import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contactUrl, letterDate, letterSchema, renderLetterDocx, type Letter } from './letter';

const SAMPLE: Letter = {
  locale: 'de',
  sender: { name: 'Erika Muster', contact: ['Berlin', 'erika@example.com', 'example.com'] },
  recipient: ['Beispiel GmbH'],
  subject: 'Bewerbung als Entwicklerin',
  place: 'Berlin',
  date: '2026-10-26',
  salutation: 'Sehr geehrte Damen und Herren,',
  paragraphs: ['ich bewerbe mich.'],
  closing: 'Mit freundlichen Grüßen',
};

describe('cover letter', () => {
  it('links email and web addresses but not places', () => {
    expect(contactUrl('erika@example.com')).toBe('mailto:erika@example.com');
    expect(contactUrl('www.linkedin.com/in/someone')).toBe('https://www.linkedin.com/in/someone');
    expect(contactUrl('https://inomov.online')).toBe('https://inomov.online');
    expect(contactUrl('Saarbrücken, Deutschland')).toBeUndefined();
  });

  it('rejects a letter without paragraphs or with an invalid date', () => {
    expect(letterSchema.safeParse({ ...SAMPLE, paragraphs: [] }).success).toBe(false);
    expect(letterSchema.safeParse({ ...SAMPLE, date: '26.10.2026' }).success).toBe(false);
    expect(letterSchema.safeParse(SAMPLE).success).toBe(true);
  });

  it('dates the letter in its own language', () => {
    expect(letterDate(SAMPLE)).toBe('Berlin, 26. Oktober 2026');
    expect(letterDate({ ...SAMPLE, locale: 'en' })).toBe('Berlin, October 26, 2026');
  });

  it('renders a Word document with the font embedded', async () => {
    const fonts = 'node_modules/geist/dist/fonts/geist-sans';
    const docx = await renderLetterDocx(SAMPLE, {
      name: 'Geist',
      regular: readFileSync(`${fonts}/Geist-Regular.ttf`),
      bold: readFileSync(`${fonts}/Geist-Bold.ttf`),
    });
    const raw = docx.toString('latin1');
    expect(raw.startsWith('PK')).toBe(true);
    expect(raw).toMatch(/word\/fonts\/[^"]+\.odttf/);
  }, 30_000);
});
