import { availability } from '@/data/availability';
import { describeAvailability } from '@/data/describe';
import { experience } from '@/data/experience';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import type { Locale } from '@/i18n/locales';
import { childPathFor, pathFor } from '@/i18n/routes';
import { SITE_URL } from './structured-data';

/** English is the canonical résumé; German is offered alongside it. */
export function resumePath(locale: Locale): string {
  return locale === 'en' ? '/api/resume.json' : `/api/resume.${locale}.json`;
}

/**
 * The CV in the JSON Resume format (https://jsonresume.org/schema), so any tool or agent
 * that understands the standard can read it without knowing this site.
 */
export function buildResume(locale: Locale) {
  const absolute = (path: string) => new URL(path, SITE_URL).href;
  const work = experience.filter((entry) => entry.kind === 'work');
  const education = experience.filter((entry) => entry.kind === 'education');

  return {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: profile.name,
      label: profile.headline[locale],
      email: profile.email,
      url: absolute(pathFor('home', locale)),
      summary: profile.summary[locale],
      location: profile.address,
      profiles: [
        { network: 'GitHub', username: 'farrukhinomov', url: profile.links.github },
        { network: 'LinkedIn', username: 'farrukhinomov', url: profile.links.linkedin },
      ],
    },
    work: work.map((entry) => ({
      name: entry.organization,
      position: entry.role[locale],
      location: entry.location[locale],
      startDate: entry.start,
      ...(entry.end && { endDate: entry.end }),
      summary: entry.summary[locale],
      highlights: entry.highlights.map((item) => item[locale]),
      ...(entry.stack.length > 0 && { keywords: entry.stack }),
    })),
    education: education.map((entry) => ({
      institution: entry.organization,
      studyType: entry.role[locale],
      startDate: entry.start,
      ...(entry.end && { endDate: entry.end }),
    })),
    awards: profile.awards.map((award) => ({
      title: award.title[locale],
      date: String(award.year),
    })),
    languages: profile.languages.map((language) => ({
      language: language.name[locale],
      fluency: language.level[locale],
    })),
    skills: [{ name: 'Technologies', keywords: [...new Set(experience.flatMap((e) => e.stack))] }],
    projects: projects.map((project) => ({
      name: project.name,
      description: project.description[locale],
      keywords: project.stack,
      url: absolute(childPathFor('projects', locale, project.slug)),
      ...(project.visibility === 'public' && {
        repository: `https://github.com/${project.repository}`,
      }),
    })),
    meta: {
      canonical: absolute(resumePath(locale)),
      version: 'v1.0.0',
      lastModified: availability.updated,
      availability: {
        summary: describeAvailability(availability, locale),
        openTo: availability.openTo,
        countries: availability.countries,
        remote: availability.remote,
      },
    },
  };
}
