import { describe, expect, it } from 'vitest';
import { isLocale, LOCALES, otherLocale } from './locales';
import { alternatesFor, alternatesForChild, childPathFor, pathFor, ROUTES } from './routes';
import { useTranslations } from './ui';

describe('locales', () => {
  it('recognises supported locales only', () => {
    expect(isLocale('de')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('switches between the two locales', () => {
    expect(otherLocale('de')).toBe('en');
    expect(otherLocale('en')).toBe('de');
  });
});

describe('routes', () => {
  it('serves German without a prefix and English under /en', () => {
    for (const paths of Object.values(ROUTES)) {
      expect(paths.de.startsWith('/en')).toBe(false);
      expect(paths.en.startsWith('/en')).toBe(true);
    }
  });

  it('uses translated slugs', () => {
    expect(pathFor('about', 'de')).toBe('/ueber-mich');
    expect(pathFor('about', 'en')).toBe('/en/about');
    expect(alternatesFor('projects')).toEqual({ de: '/projekte', en: '/en/projects' });
  });

  it('builds child paths below a route', () => {
    expect(childPathFor('projects', 'en', 'kritis-grc')).toBe('/en/projects/kritis-grc');
    expect(childPathFor('home', 'de', 'x')).toBe('/x');
    expect(alternatesForChild('projects', 'flowpro')).toEqual({
      de: '/projekte/flowpro',
      en: '/en/projects/flowpro',
    });
  });

  it('has no duplicate paths', () => {
    const paths = Object.values(ROUTES).flatMap((p) => LOCALES.map((l) => p[l]));
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('ui strings', () => {
  it('translates per locale', () => {
    expect(useTranslations('de')('nav.about')).toBe('Über mich');
    expect(useTranslations('en')('nav.about')).toBe('About');
  });
});
