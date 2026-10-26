import { isLocale, LOCALES, type Locale } from '@/i18n/locales';

/** Average adult silent reading speed for non-fiction, in words per minute. */
const WORDS_PER_MINUTE = 220;

export interface PostRef {
  /** Content entry id, `<slug>/<locale>`. */
  id: string;
  draft: boolean;
}

/** Splits a content entry id `<slug>/<locale>` into its parts. */
export function parsePostId(id: string): { slug: string; locale: Locale } {
  const [slug, locale, ...rest] = id.split('/');
  if (!slug || !isLocale(locale) || rest.length > 0) {
    throw new Error(`Post "${id}" must live at src/content/blog/<slug>/<de|en>.mdx`);
  }
  return { slug, locale };
}

/**
 * Lists every published Post that is missing in a locale.
 * A Post counts as published as soon as one locale is not a draft.
 */
export function findMissingTranslations(posts: readonly PostRef[]): string[] {
  const bySlug = new Map<string, Map<Locale, boolean>>();
  for (const post of posts) {
    const { slug, locale } = parsePostId(post.id);
    const locales = bySlug.get(slug) ?? new Map<Locale, boolean>();
    locales.set(locale, post.draft);
    bySlug.set(slug, locales);
  }

  const problems: string[] = [];
  for (const [slug, locales] of bySlug) {
    const published = [...locales.values()].some((draft) => !draft);
    if (!published) continue;
    for (const locale of LOCALES) {
      if (!locales.has(locale)) problems.push(`${slug}: missing ${locale}.mdx`);
      else if (locales.get(locale)) problems.push(`${slug}: ${locale}.mdx is still a draft`);
    }
  }
  return problems;
}

/** Estimated reading time in whole minutes, at least one. */
export function readingMinutes(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, ' ') // code is skimmed, not read word by word
    .replace(/<[^>]+>|[#>*_`[\]()!-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Markdown heading levels stop at six. */
const MAX_HEADING_LEVEL = 6;

/**
 * Turns an MDX body into plain Markdown for embedding in another document:
 * drops `import`/`export` lines and pushes every heading `demoteBy` levels down,
 * so a Post's `##` cannot become a sibling of the surrounding document's sections.
 * Fenced code blocks are left exactly as written.
 */
export function toPlainMarkdown(body: string, demoteBy = 0): string {
  let inFence = false;
  const lines: string[] = [];
  for (const line of body.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence;
    if (inFence || line.startsWith('```')) {
      lines.push(line);
      continue;
    }
    if (/^(import|export)\s/.test(line)) continue;
    const heading = /^(#{1,6})\s/.exec(line);
    if (heading?.[1] && demoteBy > 0) {
      const level = Math.min(MAX_HEADING_LEVEL, heading[1].length + demoteBy);
      lines.push('#'.repeat(level) + line.slice(heading[1].length));
      continue;
    }
    lines.push(line);
  }
  return lines.join('\n').trim();
}
