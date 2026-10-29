import { z } from 'astro/zod';
import { LOCALES } from '@/i18n/locales';

/**
 * Input and output schemas of the MCP tools. The SDK turns them into the JSON Schema clients see,
 * checks arguments before a tool runs and checks results before they leave the server.
 */

export const langInput = z
  .enum(LOCALES)
  .default('en')
  .describe('Language of the answer: "de" for German or "en" for English.');

const yearMonth = z.string().describe('Month as YYYY-MM');
const isoDay = z.string().describe('Day as YYYY-MM-DD');

export const profileOutput = z.object({
  name: z.string(),
  headline: z.string(),
  summary: z.string(),
  location: z.string(),
  email: z.string(),
  developerSince: yearMonth,
  languages: z.array(z.object({ language: z.string(), level: z.string() })),
  awards: z.array(z.object({ title: z.string(), year: z.number() })),
  links: z.object({
    website: z.string(),
    about: z.string(),
    contact: z.string(),
    cv: z.string().describe('The CV as PDF'),
    github: z.string(),
    linkedin: z.string(),
  }),
});

export const experienceOutput = z.object({
  entries: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['work', 'education']),
      organization: z.string(),
      role: z.string(),
      location: z.string(),
      start: yearMonth,
      end: yearMonth.nullable().describe('null while the position is current'),
      period: z.string().describe('The period as written on the site'),
      summary: z.string(),
      highlights: z.array(z.string()),
      stack: z.array(z.string()),
    }),
  ),
});

export const skillsOutput = z.object({
  groups: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      note: z.string().optional(),
      skills: z.array(z.string()),
    }),
  ),
});

const projectSummary = z.object({
  slug: z.string(),
  name: z.string(),
  kind: z.string().optional(),
  tagline: z.string(),
  stack: z.array(z.string()),
  year: z.number(),
  featured: z.boolean(),
  sourceAvailable: z.boolean().describe('false: the source is private and shown on request'),
  links: z.object({
    page: z.string(),
    homepage: z.string().optional(),
    repository: z.string().optional(),
  }),
});

export const projectListOutput = z.object({ projects: z.array(projectSummary) });

export const projectOutput = projectSummary.extend({
  description: z.string(),
  sections: z.array(z.object({ heading: z.string(), items: z.array(z.string()) })),
  sectionsUpdated: isoDay.optional(),
});

const postSummary = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  published: isoDay,
  updated: isoDay.optional(),
  tags: z.array(z.string()),
  readingMinutes: z.number(),
  url: z.string(),
});

export const postListOutput = z.object({ posts: z.array(postSummary) });

export const postOutput = postSummary.extend({
  markdown: z.string().describe('The whole Post as Markdown'),
});
