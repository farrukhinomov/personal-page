import { getPosts } from '@/blog/posts';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import { LOCALES, type Locale } from '@/i18n/locales';
import { pageMeta } from '@/i18n/pages';
import { ROUTES, type RouteKey } from '@/i18n/routes';
import { useTranslations } from '@/i18n/ui';
import type { OgCard } from './og-render';

export interface OgEntry {
  locale: Locale;
  /** Path segments below `/og/<locale>/`, without `.png`. */
  segments: string[];
  card: OgCard;
}

const NAV_KEY = {
  home: 'nav.home',
  about: 'nav.about',
  projects: 'nav.projects',
  blog: 'nav.blog',
  contact: 'nav.contact',
} as const satisfies Record<RouteKey, Parameters<ReturnType<typeof useTranslations>>[0]>;

export interface OgPost {
  slug: string;
  title: string;
  description: string;
}

/** Every page that gets a generated Open Graph image, given the Posts of each locale. */
export function buildOgEntries(postsByLocale: Record<Locale, readonly OgPost[]>): OgEntry[] {
  return LOCALES.flatMap((locale): OgEntry[] => {
    const t = useTranslations(locale);

    const pages = (Object.keys(ROUTES) as RouteKey[]).map((route) => {
      const meta = pageMeta(route, locale);
      const isHome = route === 'home';
      return {
        locale,
        segments: [route],
        card: {
          kicker: isHome ? profile.headline[locale] : t(NAV_KEY[route]),
          title: meta.title,
          subtitle: isHome ? undefined : meta.description,
        },
      };
    });

    const projectCards = projects.map((project) => ({
      locale,
      segments: ['projects', project.slug],
      card: { kicker: t('nav.projects'), title: project.name, subtitle: project.tagline[locale] },
    }));

    const postCards = postsByLocale[locale].map((post) => ({
      locale,
      segments: ['blog', post.slug],
      card: { kicker: t('nav.blog'), title: post.title, subtitle: post.description },
    }));

    return [...pages, ...projectCards, ...postCards];
  });
}

export async function ogEntries(): Promise<OgEntry[]> {
  const toOgPosts = async (locale: Locale) =>
    (await getPosts(locale)).map(({ slug, entry }) => ({
      slug,
      title: entry.data.title,
      description: entry.data.description,
    }));
  const [de, en] = await Promise.all([toOgPosts('de'), toOgPosts('en')]);
  return buildOgEntries({ de, en });
}
