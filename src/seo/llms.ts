import { describePeriod, skillLabel } from '@/data/describe';
import { experience } from '@/data/experience';
import { cvPath } from '@/cv/paths';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import { skills } from '@/data/skills';
import { LOCALES } from '@/i18n/locales';
import { pageMeta } from '@/i18n/pages';
import { childPathFor, pathFor, ROUTES, type RouteKey } from '@/i18n/routes';
import { SITE_URL } from './structured-data';

/**
 * llms.txt (https://llmstxt.org): a Markdown map of the site for language models.
 * English first, because most agents work in English; German pages are linked too.
 */

export interface PostSummary {
  title: string;
  description: string;
  path: string;
  /** Raw Markdown body; only used by llms-full.txt. */
  body: string;
}

const absolute = (path: string) => new URL(path, SITE_URL).href;
const link = (title: string, path: string, note?: string) =>
  `- [${title}](${absolute(path)})${note ? `: ${note}` : ''}`;

function header(): string[] {
  return [
    `# ${profile.name}`,
    '',
    `> ${profile.headline.en}, based in ${profile.location.en}.`,
    '',
    profile.summary.en,
    '',
    `Contact: ${profile.email}. The site is bilingual: German at ${absolute('/')}, English at ${absolute('/en')}.`,
  ];
}

export function buildLlmsTxt(posts: readonly PostSummary[]): string {
  const pages = (Object.keys(ROUTES) as RouteKey[]).flatMap((route) =>
    LOCALES.map((locale) =>
      link(
        `${pageMeta(route, locale).title} (${locale})`,
        pathFor(route, locale),
        pageMeta(route, locale).description,
      ),
    ),
  );

  return [
    ...header(),
    '',
    '## Pages',
    '',
    ...pages,
    '',
    '## Projects',
    '',
    ...projects.map((project) =>
      link(project.name, childPathFor('projects', 'en', project.slug), project.tagline.en),
    ),
    '',
    '## Blog',
    '',
    ...(posts.length > 0
      ? posts.map((post) => link(post.title, post.path, post.description))
      : ['- No posts yet.']),
    '',
    '## Machine-readable',
    '',
    link('Résumé (JSON Resume)', '/api/resume.json', 'the full CV in the jsonresume.org format'),
    link('Résumé in German (JSON Resume)', '/api/resume.de.json'),
    link(
      'Full text for language models',
      '/llms-full.txt',
      'CV, projects and every blog post in one file',
    ),
    link('CV as PDF (English)', cvPath('en')),
    link('CV as PDF (German)', cvPath('de')),
    link('Sitemap', '/sitemap-index.xml'),
    '',
  ].join('\n');
}

export function buildLlmsFullTxt(posts: readonly PostSummary[]): string {
  const work = experience.map((entry) =>
    [
      `### ${entry.role.en}, ${entry.organization}`,
      '',
      `${describePeriod(entry, 'en')}, ${entry.location.en}`,
      '',
      entry.summary.en,
      ...entry.highlights.map((item) => `- ${item.en}`),
      ...(entry.stack.length > 0 ? ['', `Technologies: ${entry.stack.join(', ')}`] : []),
    ].join('\n'),
  );

  const projectSections = projects.map((project) =>
    [
      `### ${project.name} (${project.year})`,
      '',
      project.description.en,
      '',
      `Technologies: ${project.stack.join(', ')}`,
      project.visibility === 'public'
        ? `Source: https://github.com/${project.repository}`
        : 'Source: private, available on request',
      ...(project.homepage ? [`Live: ${project.homepage}`] : []),
    ].join('\n'),
  );

  const postSections = posts.map((post) =>
    [`### ${post.title}`, '', `URL: ${absolute(post.path)}`, '', post.body.trim()].join('\n'),
  );

  return [
    ...header(),
    '',
    '## Skills',
    '',
    ...skills.map(
      (group) =>
        `- ${group.name.en}${group.note ? ` (${group.note.en})` : ''}: ${group.items.map((item) => skillLabel(item, 'en')).join(', ')}`,
    ),
    '',
    '## Languages',
    '',
    ...profile.languages.map((language) => `- ${language.name.en}: ${language.level.en}`),
    '',
    '## Experience',
    '',
    work.join('\n\n'),
    '',
    '## Projects',
    '',
    projectSections.join('\n\n'),
    '',
    '## Blog posts',
    '',
    postSections.length > 0 ? postSections.join('\n\n') : 'No posts yet.',
    '',
  ].join('\n');
}
