import type { Locale } from '@/i18n/locales';
import { childPathFor } from '@/i18n/routes';
import type { PostSummary } from '@/seo/llms';
import { toPlainMarkdown } from './post-utils';
import { getPosts } from './posts';

/** Posts in one locale, reduced to what machine-readable outputs need. */
export async function getPostSummaries(locale: Locale): Promise<PostSummary[]> {
  return (await getPosts(locale)).map(({ slug, entry }) => ({
    title: entry.data.title,
    description: entry.data.description,
    path: childPathFor('blog', locale, slug),
    // Posts sit under `### <title>` in llms-full.txt, so their own headings start at level 4.
    body: toPlainMarkdown(entry.body ?? '', 2),
  }));
}
