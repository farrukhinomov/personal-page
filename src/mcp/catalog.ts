import { cvPath } from '@/cv/paths';
import { describePeriod, skillLabel } from '@/data/describe';
import { experience } from '@/data/experience';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import type { Project } from '@/data/schema';
import { skills } from '@/data/skills';
import type { Locale } from '@/i18n/locales';
import { childPathFor, pathFor } from '@/i18n/routes';
import { SITE_URL } from '@/seo/structured-data';

/**
 * What the MCP tools return: the Portfolio's own data in one language, with absolute links to the
 * matching pages. The pages, llms.txt and the JSON résumé read the same modules, so an Agent sees
 * what a Visitor sees.
 */

/** A Post as the MCP tools need it; loaded from the blog collection by `posts.ts`. */
export interface McpPost {
  slug: string;
  title: string;
  description: string;
  published: Date;
  updated?: Date | undefined;
  tags: readonly string[];
  readingMinutes: number;
  /** Plain Markdown, without MDX imports. */
  body: string;
}

const absolute = (path: string) => new URL(path, SITE_URL).href;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export function profileView(locale: Locale) {
  return {
    name: profile.name,
    headline: profile.headline[locale],
    summary: profile.summary[locale],
    location: profile.location[locale],
    email: profile.email,
    developerSince: profile.developerSince,
    languages: profile.languages.map((language) => ({
      language: language.name[locale],
      level: language.level[locale],
    })),
    awards: profile.awards.map((award) => ({ title: award.title[locale], year: award.year })),
    links: {
      website: absolute(pathFor('home', locale)),
      about: absolute(pathFor('about', locale)),
      contact: absolute(pathFor('contact', locale)),
      cv: absolute(cvPath(locale)),
      github: profile.links.github,
      linkedin: profile.links.linkedin,
    },
  };
}

export function experienceView(locale: Locale, kind?: 'work' | 'education') {
  return {
    entries: experience
      .filter((entry) => !kind || entry.kind === kind)
      .map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        organization: entry.organization,
        role: entry.role[locale],
        location: entry.location[locale],
        start: entry.start,
        end: entry.end,
        period: describePeriod(entry, locale),
        summary: entry.summary[locale],
        highlights: entry.highlights.map((item) => item[locale]),
        stack: entry.stack,
      })),
  };
}

export function skillsView(locale: Locale) {
  return {
    groups: skills.map((group) => ({
      id: group.id,
      name: group.name[locale],
      ...(group.note && { note: group.note[locale] }),
      skills: group.items.map((item) => skillLabel(item, locale)),
    })),
  };
}

/** Where a Project's source can be seen; private repositories are "on request". */
function projectLinks(project: Project, locale: Locale) {
  return {
    page: absolute(childPathFor('projects', locale, project.slug)),
    ...(project.homepage && { homepage: project.homepage }),
    ...(project.visibility === 'public' && {
      repository: `https://github.com/${project.repository}`,
    }),
  };
}

function projectSummary(project: Project, locale: Locale) {
  return {
    slug: project.slug,
    name: project.name,
    ...(project.kind && { kind: project.kind[locale] }),
    tagline: project.tagline[locale],
    stack: project.stack,
    year: project.year,
    featured: project.featured,
    sourceAvailable: project.visibility === 'public',
    links: projectLinks(project, locale),
  };
}

export function projectListView(locale: Locale) {
  return { projects: projects.map((project) => projectSummary(project, locale)) };
}

/** One Project with its description and detail sections, or undefined for an unknown slug. */
export function projectView(slug: string, locale: Locale) {
  const project = projects.find((candidate) => candidate.slug === slug);
  if (!project) return undefined;
  return {
    ...projectSummary(project, locale),
    description: project.description[locale],
    sections: (project.sections ?? []).map((section) => ({
      heading: section.heading[locale],
      items: section.items.map((item) => item[locale]),
    })),
    ...(project.sectionsUpdated && { sectionsUpdated: project.sectionsUpdated }),
  };
}

function postSummary(post: McpPost, locale: Locale) {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    published: isoDay(post.published),
    ...(post.updated && { updated: isoDay(post.updated) }),
    tags: [...post.tags],
    readingMinutes: post.readingMinutes,
    url: absolute(childPathFor('blog', locale, post.slug)),
  };
}

export function postListView(posts: readonly McpPost[], locale: Locale) {
  return { posts: posts.map((post) => postSummary(post, locale)) };
}

/** One Post with its Markdown, or undefined for an unknown slug. */
export function postView(posts: readonly McpPost[], slug: string, locale: Locale) {
  const post = posts.find((candidate) => candidate.slug === slug);
  return post && { ...postSummary(post, locale), markdown: post.body };
}

export const PROJECT_SLUGS = projects.map((project) => project.slug);
