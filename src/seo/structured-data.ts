import { jsonForScript } from '@/lib/html';
import { skillLabel } from '@/data/describe';
import { experience } from '@/data/experience';
import { profile } from '@/data/profile';
import { skills } from '@/data/skills';
import { LANG_TAG, type Locale } from '@/i18n/locales';

/** schema.org JSON-LD node. Kept loose on purpose: schema.org has no useful TS types. */
export type JsonLd = Record<string, unknown>;

export const SITE_URL = 'https://inomov.online';

const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const absolute = (path: string) => new URL(path, SITE_URL).href;

/** Farrukh as a schema.org Person; referenced by every other node through its @id. */
export function personSchema(locale: Locale): JsonLd {
  const current = experience.find((entry) => entry.kind === 'work' && entry.end === null);
  const education = experience.find((entry) => entry.kind === 'education');
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: profile.name,
    url: SITE_URL,
    email: `mailto:${profile.email}`,
    jobTitle: profile.headline[locale],
    description: profile.summary[locale],
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.address.city,
      addressCountry: profile.address.countryCode,
    },
    sameAs: [profile.links.github, profile.links.linkedin],
    knowsLanguage: ['de', 'en', 'ru', 'tg'],
    knowsAbout: skills.flatMap((group) => group.items.map((item) => skillLabel(item, 'en'))),
    ...(current && {
      worksFor: { '@type': 'Organization', name: current.organization },
    }),
    ...(education && {
      alumniOf: { '@type': 'CollegeOrUniversity', name: education.organization },
    }),
  };
}

export function websiteSchema(locale: Locale): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: profile.name,
    inLanguage: [LANG_TAG.de, LANG_TAG.en],
    publisher: { '@id': PERSON_ID },
    description: profile.headline[locale],
  };
}

/** The About page: a ProfilePage whose main entity is the Person. */
export function profilePageSchema(path: string, locale: Locale): JsonLd {
  return {
    '@type': 'ProfilePage',
    '@id': absolute(path),
    url: absolute(path),
    inLanguage: LANG_TAG[locale],
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: { '@id': PERSON_ID },
  };
}

export interface ArticleInput {
  path: string;
  locale: Locale;
  title: string;
  description: string;
  published: Date;
  updated?: Date | undefined;
  tags: readonly string[];
  imagePath: string;
}

export function blogPostingSchema(article: ArticleInput): JsonLd {
  return {
    '@type': 'BlogPosting',
    '@id': absolute(article.path),
    url: absolute(article.path),
    mainEntityOfPage: absolute(article.path),
    headline: article.title,
    description: article.description,
    inLanguage: LANG_TAG[article.locale],
    datePublished: article.published.toISOString(),
    dateModified: (article.updated ?? article.published).toISOString(),
    ...(article.tags.length > 0 && { keywords: article.tags.join(', ') }),
    image: absolute(article.imagePath),
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    isPartOf: { '@id': WEBSITE_ID },
  };
}

/** Wraps nodes in one @graph document, so @id references resolve within the page. */
export function graph(nodes: readonly JsonLd[]): JsonLd {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

/** Serialises JSON-LD for a <script> element. */
export function serializeJsonLd(document: JsonLd): string {
  return jsonForScript(document);
}
