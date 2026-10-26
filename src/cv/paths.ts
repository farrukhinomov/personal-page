import type { Locale, Localized } from '@/i18n/locales';

/** File names of the CV's web edition per locale, served from `public/cv/` (see `pnpm cv`). */
export const CV_FILE: Localized = {
  de: 'farrukh-inomov-lebenslauf',
  en: 'farrukh-inomov-cv',
};

export function cvPath(locale: Locale): string {
  return `/cv/${CV_FILE[locale]}.pdf`;
}
