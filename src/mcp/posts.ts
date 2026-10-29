import { getPosts } from '@/blog/posts';
import { toPlainMarkdown } from '@/blog/post-utils';
import type { Locale, Localized } from '@/i18n/locales';
import type { McpPost } from './catalog';

/** The Posts in one locale that were published at `now`, as the MCP tools return them. */
async function postsIn(locale: Locale, now: Date): Promise<McpPost[]> {
  return (await getPosts(locale, now)).map(({ slug, entry, readingMinutes }) => ({
    slug,
    title: entry.data.title,
    description: entry.data.description,
    published: entry.data.published,
    updated: entry.data.updated,
    tags: entry.data.tags,
    readingMinutes,
    body: toPlainMarkdown(entry.body ?? ''),
  }));
}

/**
 * The Posts in every locale; the blog collection guarantees both exist for each Post. The route
 * passes the build time as `now`, so Agents see the Posts the static pages show.
 */
export async function loadMcpPosts(now: Date): Promise<Localized<McpPost[]>> {
  const [de, en] = await Promise.all([postsIn('de', now), postsIn('en', now)]);
  return { de, en };
}
