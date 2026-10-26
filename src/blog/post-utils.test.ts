import { describe, expect, it } from 'vitest';
import {
  findMissingTranslations,
  parsePostId,
  readingMinutes,
  toPlainMarkdown,
} from './post-utils';
import { selectPosts } from './posts';

describe('parsePostId', () => {
  it('splits slug and locale', () => {
    expect(parsePostId('hello-world/en')).toEqual({ slug: 'hello-world', locale: 'en' });
  });

  it('rejects ids outside the <slug>/<locale> layout', () => {
    expect(() => parsePostId('hello-world')).toThrow('src/content/blog/<slug>/<de|en>.mdx');
    expect(() => parsePostId('hello/fr')).toThrow();
    expect(() => parsePostId('a/b/de')).toThrow();
  });
});

describe('findMissingTranslations', () => {
  it('accepts a Post that exists in both locales', () => {
    expect(
      findMissingTranslations([
        { id: 'a/de', draft: false },
        { id: 'a/en', draft: false },
      ]),
    ).toEqual([]);
  });

  it('reports a published Post without its translation', () => {
    expect(findMissingTranslations([{ id: 'a/de', draft: false }])).toEqual(['a: missing en.mdx']);
  });

  it('reports a published Post whose translation is still a draft', () => {
    expect(
      findMissingTranslations([
        { id: 'a/de', draft: false },
        { id: 'a/en', draft: true },
      ]),
    ).toEqual(['a: en.mdx is still a draft']);
  });

  it('allows a Post that is a draft in every locale to be incomplete', () => {
    expect(findMissingTranslations([{ id: 'a/de', draft: true }])).toEqual([]);
  });
});

describe('readingMinutes', () => {
  it('rounds to whole minutes with a minimum of one', () => {
    expect(readingMinutes('short')).toBe(1);
    expect(readingMinutes(Array.from({ length: 660 }, () => 'word').join(' '))).toBe(3);
  });

  it('ignores code blocks and markup', () => {
    const code = '```ts\n' + 'const x = 1;\n'.repeat(500) + '```';
    expect(readingMinutes(`## Title\n\n${code}\n\nOne line of text.`)).toBe(1);
  });
});

describe('selectPosts', () => {
  const entry = (id: string, published: string, draft = false) => ({
    id,
    body: 'Some words.',
    data: { title: id, description: '', published: new Date(published), tags: [], draft },
  });

  it('returns one locale, newest first, with reading time', () => {
    const posts = selectPosts(
      [
        entry('old/de', '2026-01-01'),
        entry('old/en', '2026-01-01'),
        entry('new/de', '2026-06-01'),
        entry('new/en', '2026-06-01'),
      ],
      'de',
      { includeUnpublished: false },
    );
    expect(posts.map((post) => post.slug)).toEqual(['new', 'old']);
    expect(posts[0]).toMatchObject({ locale: 'de', readingMinutes: 1 });
  });

  it('hides drafts unless asked for them', () => {
    const entries = [entry('wip/de', '2026-01-01', true), entry('wip/en', '2026-01-01', true)];
    expect(selectPosts(entries, 'en', { includeUnpublished: false })).toEqual([]);
    expect(selectPosts(entries, 'en', { includeUnpublished: true })).toHaveLength(1);
  });

  it('holds back Posts dated in the future', () => {
    const entries = [entry('later/de', '2026-12-01'), entry('later/en', '2026-12-01')];
    const now = new Date('2026-10-26');
    expect(selectPosts(entries, 'de', { includeUnpublished: false, now })).toEqual([]);
    expect(selectPosts(entries, 'de', { includeUnpublished: true, now })).toHaveLength(1);
  });

  it('fails when a published Post lacks a translation', () => {
    expect(() =>
      selectPosts([entry('solo/de', '2026-01-01')], 'de', { includeUnpublished: false }),
    ).toThrow('solo: missing en.mdx');
  });
});

describe('toPlainMarkdown', () => {
  it('drops MDX import and export lines', () => {
    expect(toPlainMarkdown("import X from './x';\nexport const a = 1;\n\nText.")).toBe('Text.');
  });

  it('demotes headings so they nest below a document section', () => {
    expect(toPlainMarkdown('# One\n\n## Two\n\n#### Four', 2)).toBe(
      '### One\n\n#### Two\n\n###### Four',
    );
  });

  it('leaves code blocks untouched', () => {
    const code = '```md\n## not a heading\nimport x\n```';
    expect(toPlainMarkdown(code, 2)).toBe(code);
  });
});
