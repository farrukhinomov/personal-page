import type { Locale, Localized } from '@/i18n/locales';

/** File names of the generated CV per locale, served below `/cv/`. */
export const CV_FILE: Localized = {
  de: 'farrukh-inomov-lebenslauf',
  en: 'farrukh-inomov-cv',
};

export function cvPath(locale: Locale): string {
  return `/cv/${CV_FILE[locale]}.pdf`;
}
