import { getPosts } from '@/blog/posts';
import { toPlainMarkdown } from '@/blog/post-utils';
import type { Locale, Localized } from '@/i18n/locales';
import type { McpPost } from './catalog';

/** The published Posts in one locale, as the MCP tools return them. */
async function postsIn(locale: Locale): Promise<McpPost[]> {
  return (await getPosts(locale)).map(({ slug, entry, readingMinutes }) => ({
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

/** The Posts in every locale; the blog collection guarantees both exist for each Post. */
export async function loadMcpPosts(): Promise<Localized<McpPost[]>> {
  const [de, en] = await Promise.all([postsIn('de'), postsIn('en')]);
  return { de, en };
}
