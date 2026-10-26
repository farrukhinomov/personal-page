import { profile } from '@/data/profile';
import type { Locale, Localized } from './locales';
import type { RouteKey } from './routes';

export interface PageMeta {
  /** `<title>` and heading of the page. */
  title: string;
  /** Meta description, lead text and link-preview text. */
  description: string;
}

/**
 * Title and description of every top-level page, in one place,
 * so pages, link previews, Open Graph images and llms.txt never disagree.
 */
const PAGES: Record<RouteKey, Localized<PageMeta>> = {
  home: {
    de: {
      title: 'Business-Software, die im Alltag zuverlässig läuft.',
      description: `${profile.name}, Senior Full-Stack-Entwickler in Saarbrücken. C#/.NET, React und TypeScript – Business-Software von der Architektur bis zum Betrieb.`,
    },
    en: {
      title: 'Business software that holds up in daily use.',
      description: `${profile.name}, senior full-stack developer in Saarbrücken, Germany. C#/.NET, React and TypeScript – business software from architecture to operations.`,
    },
  },
  about: {
    de: {
      title: 'Über mich',
      description: `Werdegang, Sprachen und Schwerpunkte von ${profile.name}, Senior Full-Stack-Entwickler in Saarbrücken.`,
    },
    en: {
      title: 'About',
      description: `Experience, languages and focus of ${profile.name}, senior full-stack developer in Saarbrücken, Germany.`,
    },
  },
  projects: {
    de: {
      title: 'Projekte',
      description:
        'Eigene Projekte neben dem Beruf – von Compliance-Software bis zum Werkzeug für den Entwickleralltag.',
    },
    en: {
      title: 'Projects',
      description:
        'Projects I build alongside my job – from compliance software to tools for everyday development.',
    },
  },
  blog: {
    de: {
      title: 'Blog',
      description:
        'Notizen zu Architektur, .NET, Betrieb und Werkzeugen – aus der Arbeit an echter Business-Software.',
    },
    en: {
      title: 'Blog',
      description:
        'Notes on architecture, .NET, operations and tooling – from work on real business software.',
    },
  },
  contact: {
    de: {
      title: 'Kontakt',
      description:
        'Eine Stelle, ein Projekt oder eine Frage zu meiner Arbeit? Schreiben Sie mir – ich antworte persönlich.',
    },
    en: {
      title: 'Contact',
      description:
        'A role, a project or a question about my work? Write to me – I answer personally.',
    },
  },
};

export function pageMeta(route: RouteKey, locale: Locale): PageMeta {
  return PAGES[route][locale];
}
