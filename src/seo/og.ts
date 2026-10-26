import type { Locale } from '@/i18n/locales';

/** Path of the generated Open Graph image for a page, e.g. `/og/de/projects/kritis-grc.png`. */
export function ogImagePath(locale: Locale, ...segments: string[]): string {
  return `/og/${locale}/${segments.map(encodeURIComponent).join('/')}.png`;
}

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
