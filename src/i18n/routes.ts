import { LOCALES, type Locale, type Localized } from './locales';

/**
 * Every page of the Portfolio, with its path in each locale.
 * German is the default locale and has no prefix; slugs are translated.
 */
export const ROUTES = {
  home: { de: '/', en: '/en' },
  about: { de: '/ueber-mich', en: '/en/about' },
  projects: { de: '/projekte', en: '/en/projects' },
  blog: { de: '/blog', en: '/en/blog' },
  connect: { de: '/verbinden', en: '/en/connect' },
  contact: { de: '/kontakt', en: '/en/contact' },
  imprint: { de: '/impressum', en: '/en/imprint' },
  privacy: { de: '/datenschutz', en: '/en/privacy' },
} as const satisfies Record<string, Localized>;

export type RouteKey = keyof typeof ROUTES;

export function pathFor(route: RouteKey, locale: Locale): string {
  return ROUTES[route][locale];
}

/** Path of a child page, e.g. a single Project below the projects route. */
export function childPathFor(route: RouteKey, locale: Locale, slug: string): string {
  const base = pathFor(route, locale);
  return `${base === '/' ? '' : base}/${encodeURIComponent(slug)}`;
}

/** The same page in every locale, used for `hreflang` and the language switch. */
export function alternatesFor(route: RouteKey): Localized {
  return ROUTES[route];
}

export function alternatesForChild(route: RouteKey, slug: string): Localized {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, childPathFor(route, locale, slug)]),
  ) as Record<Locale, string>;
}
