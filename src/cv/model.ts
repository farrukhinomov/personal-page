import { formatDate } from '@/data/dates';
import { describePeriod, skillLabel } from '@/data/describe';
import { experience } from '@/data/experience';
import { legal } from '@/data/legal';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import { skills } from '@/data/skills';
import type { Locale } from '@/i18n/locales';
import { pageMeta } from '@/i18n/pages';

/**
 * The CV as plain content, built from the same data as the site.
 * The renderer (render-docx.ts) only lays this out, so everything a recruiter
 * reads can be tested here.
 *
 * Two editions: `web` is published on the site and names the city only; `application`
 * is sent by hand and adds the phone number and the street address.
 */

export type CvEdition = 'web' | 'application';

export interface CvLink {
  text: string;
  /** Absolute URL or `mailto:`/`tel:` link. */
  url?: string;
}

export interface CvEntry {
  title: string;
  subtitle?: string;
  /** Dates, e.g. "Juli 2022 – heute". */
  period?: string;
  place?: string;
  links?: CvLink[];
  text?: string;
  bullets?: string[];
  footnote?: string;
}

export interface CvSection {
  heading: string;
  entries: CvEntry[];
}

export interface CvModel {
  locale: Locale;
  edition: CvEdition;
  name: string;
  role: string;
  contact: CvLink[];
  summary: string;
  sections: CvSection[];
  footer: string;
}

export interface CvOptions {
  edition: CvEdition;
  /** Required for the application edition; never stored in the repository. */
  phone?: string;
  now?: Date;
}

/** Positions shown with highlights and technologies; older ones get one line each. */
const DETAILED_POSITIONS: ReadonlySet<string> = new Set(['intex', 'silk-road-professionals']);

/** The one project the CV describes: the flagship, with its live demo. */
const CV_PROJECT = 'kritis-grc';

const COPY = {
  de: {
    skills: 'Kenntnisse',
    experience: 'Berufserfahrung',
    project: 'Projekt',
    education: 'Ausbildung',
    languages: 'Sprachen',
    licence: 'Führerschein',
    licenceClass: 'Klasse B',
    awards: 'Auszeichnungen',
    technologies: 'Technologien',
    demo: 'Demo',
    source: 'Quellcode',
    footer: (date: string) => `Stand: ${date} – aktuelle Fassung auf inomov.online`,
  },
  en: {
    skills: 'Skills',
    experience: 'Experience',
    project: 'Project',
    education: 'Education',
    languages: 'Languages',
    licence: 'Driving licence',
    licenceClass: 'Class B (Germany)',
    awards: 'Awards',
    technologies: 'Technologies',
    demo: 'Demo',
    source: 'Source',
    footer: (date: string) => `As of ${date} – current version at inomov.online`,
  },
} as const;

const withoutScheme = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '');
const link = (url: string): CvLink => ({ text: withoutScheme(url), url });
const telUrl = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

function contactLine(locale: Locale, options: CvOptions): CvLink[] {
  const address =
    options.edition === 'application'
      ? `${legal.street}, ${legal.postalCode} ${legal.city}`
      : profile.location[locale];
  const phone = options.phone ? [{ text: options.phone, url: telUrl(options.phone) }] : [];
  return [
    { text: address },
    ...phone,
    { text: profile.email, url: `mailto:${profile.email}` },
    link('https://inomov.online'),
    link(profile.links.linkedin),
    link(profile.links.github),
  ];
}

function experienceEntries(locale: Locale): CvEntry[] {
  const copy = COPY[locale];
  return experience
    .filter((entry) => entry.kind === 'work')
    .map((entry) => {
      const detailed = DETAILED_POSITIONS.has(entry.id);
      return {
        title: entry.role[locale],
        subtitle: entry.organization,
        period: describePeriod(entry, locale),
        place: entry.location[locale],
        text: entry.summary[locale],
        ...(detailed &&
          entry.highlights.length > 0 && {
            bullets: entry.highlights.map((item) => item[locale]),
          }),
        ...(detailed &&
          entry.stack.length > 0 && {
            footnote: `${copy.technologies}: ${entry.stack.join(', ')}`,
          }),
      };
    });
}

function projectEntry(locale: Locale): CvEntry {
  const copy = COPY[locale];
  const project = projects.find((candidate) => candidate.slug === CV_PROJECT);
  if (!project) throw new Error(`CV project "${CV_PROJECT}" is missing from projects.ts`);
  return {
    title: project.kind ? `${project.name} – ${project.kind[locale]}` : project.name,
    links: [
      ...(project.homepage
        ? [{ ...link(project.homepage), text: `${copy.demo}: ${withoutScheme(project.homepage)}` }]
        : []),
      {
        text: `${copy.source}: github.com/${project.repository}`,
        url: `https://github.com/${project.repository}`,
      },
    ],
    text: project.description[locale],
    footnote: `${copy.technologies}: ${project.stack.join(', ')}`,
  };
}

export function buildCvModel(locale: Locale, options: CvOptions): CvModel {
  if (options.edition === 'application' && !options.phone) {
    throw new Error('The application edition needs a phone number');
  }
  if (options.edition === 'web' && options.phone) {
    throw new Error('The web edition is published and must not contain a phone number');
  }
  const copy = COPY[locale];

  return {
    locale,
    edition: options.edition,
    name: profile.name,
    role: pageMeta('home', locale).title,
    contact: contactLine(locale, options),
    summary: profile.summary[locale],
    sections: [
      {
        heading: copy.skills,
        entries: skills.map((group) => ({
          title: group.name[locale],
          ...(group.note && { subtitle: group.note[locale] }),
          text: group.items.map((item) => skillLabel(item, locale)).join(', '),
        })),
      },
      { heading: copy.experience, entries: experienceEntries(locale) },
      { heading: copy.project, entries: [projectEntry(locale)] },
      {
        heading: copy.education,
        entries: experience
          .filter((entry) => entry.kind === 'education')
          .map((entry) => ({
            title: entry.role[locale],
            period: describePeriod(entry, locale),
            place: `${entry.organization}, ${entry.location[locale]}`,
          })),
      },
      {
        heading: copy.languages,
        entries: [
          {
            title: profile.languages
              .map((language) => `${language.name[locale]} (${language.level[locale]})`)
              .join(', '),
          },
        ],
      },
      { heading: copy.licence, entries: [{ title: copy.licenceClass }] },
      {
        heading: copy.awards,
        entries: profile.awards.map((award) => ({
          title: `${award.title[locale]}, ${award.year}`,
        })),
      },
    ],
    footer: copy.footer(formatDate(options.now ?? new Date(), locale)),
  };
}
