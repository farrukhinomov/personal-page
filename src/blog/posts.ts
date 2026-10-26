import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/locales';
import { findMissingTranslations, parsePostId, readingMinutes } from './post-utils';

type BlogEntry = Pick<CollectionEntry<'blog'>, 'id' | 'body' | 'data'>;

export interface Post<Entry extends BlogEntry = CollectionEntry<'blog'>> {
  slug: string;
  locale: Locale;
  entry: Entry;
  readingMinutes: number;
}

/**
 * Picks the Posts of one locale, newest first.
 * Throws when a published Post is missing a translation, which fails the build.
 */
export function selectPosts<Entry extends BlogEntry>(
  entries: readonly Entry[],
  locale: Locale,
  { includeUnpublished, now = new Date() }: { includeUnpublished: boolean; now?: Date },
): Post<Entry>[] {
  const missing = findMissingTranslations(
    entries.map((entry) => ({ id: entry.id, draft: entry.data.draft })),
  );
  if (missing.length > 0) {
    throw new Error(`Every Post needs German and English:\n  ${missing.join('\n  ')}`);
  }

  return entries
    .filter((entry) => includeUnpublished || (!entry.data.draft && entry.data.published <= now))
    .map((entry) => ({
      ...parsePostId(entry.id),
      entry,
      readingMinutes: readingMinutes(entry.body ?? ''),
    }))
    .filter((post) => post.locale === locale)
    .sort((a, b) => b.entry.data.published.getTime() - a.entry.data.published.getTime());
}

/**
 * All Posts in one locale. Drafts and Posts dated in the future are listed while developing;
 * a production build leaves them out (the monthly rebuild publishes scheduled Posts).
 */
export async function getPosts(locale: Locale): Promise<Post[]> {
  return selectPosts(await getCollection('blog'), locale, {
    includeUnpublished: import.meta.env.DEV,
  });
}
