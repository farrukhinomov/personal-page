import rss from '@astrojs/rss';
import { profile } from '@/data/profile';
import { LANG_TAG, type Locale } from '@/i18n/locales';
import { pageMeta } from '@/i18n/pages';
import { childPathFor, pathFor } from '@/i18n/routes';
import { SITE_URL } from '@/seo/structured-data';
import { getPosts } from './posts';

/** RSS 2.0 feed of all Posts in one locale. */
export async function blogFeed(locale: Locale): Promise<Response> {
  const posts = await getPosts(locale);
  const blogUrl = new URL(pathFor('blog', locale), SITE_URL);
  const feedUrl = `${blogUrl.href}/rss.xml`;
  const lastBuildDate = posts[0]?.entry.data.updated ?? posts[0]?.entry.data.published;
  return rss({
    title: `${profile.name} – Blog`,
    description: pageMeta('blog', locale).description,
    // The channel links to this locale's blog; item links are absolute paths on the same origin.
    site: blogUrl,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    // Matches `trailingSlash: 'never'` in astro.config.mjs, so links don't redirect.
    trailingSlash: false,
    customData: [
      `<language>${LANG_TAG[locale]}</language>`,
      `<atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>`,
      lastBuildDate ? `<lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>` : '',
    ].join(''),
    items: posts.map(({ slug, entry }) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.published,
      link: childPathFor('blog', locale, slug),
      categories: entry.data.tags,
      author: `${profile.email} (${profile.name})`,
    })),
  });
}
