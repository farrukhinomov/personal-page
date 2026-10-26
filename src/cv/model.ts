import { formatDate } from '@/data/dates';
import { describePeriod, skillLabel } from '@/data/describe';
import { experience } from '@/data/experience';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import { skills } from '@/data/skills';
import type { Locale } from '@/i18n/locales';
import { pageMeta } from '@/i18n/pages';

/**
 * The CV as plain content, built from the same data as the site.
 * Rendering (src/cv/render-pdf.ts) only lays this out, so everything a recruiter reads
 * can be tested here: no phone number, no street address, both languages complete.
 */

export interface CvEntry {
  title: string;
  subtitle?: string;
  meta?: string;
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
  name: string;
  role: string;
  contact: string[];
  summary: string;
  sections: CvSection[];
  footer: string;
}

const COPY = {
  de: {
    skills: 'Kenntnisse',
    experience: 'Berufserfahrung',
    projects: 'Projekte',
    education: 'Ausbildung',
    languages: 'Sprachen',
    awards: 'Auszeichnungen',
    technologies: 'Technologien',
    source: 'Quellcode',
    privateSource: 'Quellcode auf Anfrage',
    live: 'Live',
    footer: (date: string) => `Stand: ${date} – aktuelle Fassung auf inomov.online`,
  },
  en: {
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    languages: 'Languages',
    awards: 'Awards',
    technologies: 'Technologies',
    source: 'Source',
    privateSource: 'Source on request',
    live: 'Live',
    footer: (date: string) => `As of ${date} – current version at inomov.online`,
  },
} as const;

const withoutScheme = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '');

export function buildCvModel(locale: Locale, now: Date = new Date()): CvModel {
  const copy = COPY[locale];

  const skillEntries: CvEntry[] = skills.map((group) => ({
    title: group.name[locale],
    ...(group.note && { subtitle: group.note[locale] }),
    text: group.items.map((item) => skillLabel(item, locale)).join(', '),
  }));

  const toEntry = (entry: (typeof experience)[number]): CvEntry => ({
    title: entry.role[locale],
    subtitle: entry.organization,
    meta: `${describePeriod(entry, locale)}, ${entry.location[locale]}`,
    text: entry.summary[locale],
    ...(entry.highlights.length > 0 && { bullets: entry.highlights.map((item) => item[locale]) }),
    ...(entry.stack.length > 0 && { footnote: `${copy.technologies}: ${entry.stack.join(', ')}` }),
  });

  const projectEntries: CvEntry[] = projects.map((project) => {
    const links = [
      project.homepage && `${copy.live}: ${withoutScheme(project.homepage)}`,
      project.visibility === 'public'
        ? `${copy.source}: github.com/${project.repository}`
        : copy.privateSource,
    ].filter(Boolean);
    return {
      title: project.kind ? `${project.name} – ${project.kind[locale]}` : project.name,
      meta: links.join('   '),
      text: project.description[locale],
      footnote: `${copy.technologies}: ${project.stack.join(', ')}`,
    };
  });

  return {
    locale,
    name: profile.name,
    role: pageMeta('home', locale).title,
    contact: [
      profile.location[locale],
      profile.email,
      'inomov.online',
      withoutScheme(profile.links.github),
      withoutScheme(profile.links.linkedin),
    ],
    summary: profile.summary[locale],
    sections: [
      { heading: copy.skills, entries: skillEntries },
      {
        heading: copy.experience,
        entries: experience.filter((entry) => entry.kind === 'work').map(toEntry),
      },
      { heading: copy.projects, entries: projectEntries },
      {
        heading: copy.education,
        entries: experience.filter((entry) => entry.kind === 'education').map(toEntry),
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
      {
        heading: copy.awards,
        entries: profile.awards.map((award) => ({
          title: `${award.title[locale]}, ${award.year}`,
        })),
      },
    ],
    footer: copy.footer(formatDate(now, locale)),
  };
}
