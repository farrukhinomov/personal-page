import { SITE_URL } from './structured-data';

/**
 * Everything is public and meant to be found, by search engines and AI crawlers alike.
 * Named AI crawlers are listed to make that choice explicit, not to treat them differently.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
] as const;

export function buildRobotsTxt(): string {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    ...AI_CRAWLERS.flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', '']),
    `Sitemap: ${SITE_URL}/sitemap-index.xml`,
    '',
  ].join('\n');
}
