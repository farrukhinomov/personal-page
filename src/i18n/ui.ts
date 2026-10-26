import type { Locale } from './locales';

const de = {
  'site.description':
    'Farrukh Inomov, Senior Full-Stack-Entwickler in Saarbrücken. C#/.NET, React und TypeScript – Business-Software von der Architektur bis zum Betrieb.',
  'a11y.skip': 'Zum Inhalt springen',
  'a11y.mainNav': 'Hauptnavigation',
  'a11y.menuOpen': 'Menü öffnen',
  'a11y.menuClose': 'Menü schließen',
  'a11y.darkTheme': 'Dunkles Design',
  'a11y.switchLanguage': 'Switch to English',
  'nav.home': 'Start',
  'nav.about': 'Über mich',
  'nav.projects': 'Projekte',
  'nav.contact': 'Kontakt',
  'lang.short': 'EN',
  'footer.builtWith': 'Gebaut mit Astro, ausgeliefert von Vercel.',
  'notFound.title': 'Diese Seite gibt es nicht',
  'notFound.body': 'Die Adresse ist falsch oder die Seite wurde verschoben.',
  'notFound.back': 'Zur Startseite',
} as const;

type UiKey = keyof typeof de;

const en: Record<UiKey, string> = {
  'site.description':
    'Farrukh Inomov, senior full-stack developer in Saarbrücken, Germany. C#/.NET, React and TypeScript – business software from architecture to operations.',
  'a11y.skip': 'Skip to content',
  'a11y.mainNav': 'Main navigation',
  'a11y.menuOpen': 'Open menu',
  'a11y.menuClose': 'Close menu',
  'a11y.darkTheme': 'Dark theme',
  'a11y.switchLanguage': 'Auf Deutsch lesen',
  'nav.home': 'Home',
  'nav.about': 'About',
  'nav.projects': 'Projects',
  'nav.contact': 'Contact',
  'lang.short': 'DE',
  'footer.builtWith': 'Built with Astro, served by Vercel.',
  'notFound.title': 'This page does not exist',
  'notFound.body': 'The address is wrong or the page has moved.',
  'notFound.back': 'Back to the start page',
};

const dictionaries: Record<Locale, Record<UiKey, string>> = { de, en };

/** Returns a translator bound to one locale. */
export function useTranslations(locale: Locale) {
  return (key: UiKey): string => dictionaries[locale][key];
}
