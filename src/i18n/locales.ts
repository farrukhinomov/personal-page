export const LOCALES = ['de', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'de';

/** Text that exists in every locale. */
export type Localized<T = string> = Readonly<Record<Locale, T>>;

/** Value for the `lang` attribute and `hreflang` links. */
export const LANG_TAG: Localized = { de: 'de', en: 'en' };

/** Value for `og:locale`. */
export const OG_LOCALE: Localized = { de: 'de_DE', en: 'en_US' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'de' ? 'en' : 'de';
}
