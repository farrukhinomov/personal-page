import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { legal } from '@/data/legal';
import { LOCALES } from '@/i18n/locales';

const PAGES = ['imprint', 'privacy'] as const;

const read = (page: string, locale: string) =>
  readFileSync(join(__dirname, 'legal', page, `${locale}.mdx`), 'utf-8');

describe('legal texts', () => {
  it('exist in German and English for every legal page', () => {
    for (const page of PAGES)
      for (const locale of LOCALES) expect(read(page, locale).length).toBeGreaterThan(200);
  });

  it('show the postal address from the typed data, not a copy of it', () => {
    for (const locale of LOCALES) {
      const imprint = read('imprint', locale);
      expect(imprint).toContain('{legal.street}');
      expect(imprint).toContain('legal.postalCode');
      expect(imprint).not.toContain(legal.street);
    }
    expect(`${legal.street}, ${legal.postalCode} ${legal.city}`).toBe(
      'Waldstraße 6, 66113 Saarbrücken',
    );
  });

  it('never contain a phone number', () => {
    for (const page of PAGES)
      for (const locale of LOCALES)
        expect(read(page, locale)).not.toMatch(/\+\d|\d{10,}|tel(efon|ephone)?[:\s]/i);
  });

  it('have the same number of sections in both languages', () => {
    const headings = (text: string) => (text.match(/^## /gm) ?? []).length;
    for (const page of PAGES) expect(headings(read(page, 'de'))).toBe(headings(read(page, 'en')));
  });

  it('name every service the contact form uses, in both languages', () => {
    for (const locale of LOCALES) {
      const privacy = read('privacy', locale);
      for (const service of [
        'Vercel',
        'Resend',
        'Cloudflare Turnstile',
        'Upstash',
        'Gmail',
        'Cloudflare Email Routing',
        'Cal.com',
      ]) {
        expect(privacy).toContain(service);
      }
    }
  });

  it('keep the claims in the privacy policy true: no cookies, Vercel Web Analytics only', () => {
    expect(read('privacy', 'de')).toContain('keine Cookies');
    expect(read('privacy', 'en')).toContain('no cookies');
    // The adapter adds the analytics script; the policy must say so as long as it does.
    const config = readFileSync(join(__dirname, '..', '..', 'astro.config.mjs'), 'utf-8');
    expect(config).toContain('webAnalytics');
    for (const locale of LOCALES) {
      expect(read('privacy', locale)).toContain('Vercel Web Analytics');
      expect(read('privacy', locale)).toContain('/_vercel/insights/script.js');
    }
  });
});
