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
      title: 'Senior Full-Stack Software Engineer',
      description: `${profile.name}, Senior Full-Stack Software Engineer in Saarbrücken: C#/.NET beruflich, React/TypeScript und Python/Django im GRC-Eigenprojekt.`,
    },
    en: {
      title: 'Senior Full-Stack Software Engineer',
      description: `${profile.name}, senior full-stack software engineer in Saarbrücken, Germany: C#/.NET professionally, React/TypeScript and Python/Django in an own GRC project.`,
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
  connect: {
    de: {
      title: 'Mit KI-Assistenten verbinden',
      description:
        'Verbinden Sie Claude, ChatGPT oder Cursor mit meinem Portfolio: Fragen zu Erfahrung und Projekten stellen, eine Nachricht senden, einen Intro Call anfragen.',
    },
    en: {
      title: 'Connect your AI assistant',
      description:
        'Connect Claude, ChatGPT or Cursor to my portfolio: ask about my experience and projects, send a message, request an intro call.',
    },
  },
  imprint: {
    de: {
      title: 'Impressum',
      description: 'Anbieterkennzeichnung nach § 5 DDG für inomov.online.',
    },
    en: {
      title: 'Imprint',
      description: 'Legal notice under § 5 DDG (German Digital Services Act) for inomov.online.',
    },
  },
  privacy: {
    de: {
      title: 'Datenschutzerklärung',
      description:
        'Welche Daten beim Besuch von inomov.online verarbeitet werden und welche Rechte Sie haben.',
    },
    en: {
      title: 'Privacy policy',
      description: 'Which data is processed when you visit inomov.online and what rights you have.',
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
