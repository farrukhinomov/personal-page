import { describe, expect, it, vi } from 'vitest';
import type { Locale } from '@/i18n/locales';
import { loadMcpPosts } from './posts';

vi.mock('@/blog/posts', () => ({
  getPosts: async (locale: Locale) => [
    {
      slug: 'react-quality-gates',
      locale,
      readingMinutes: 6,
      entry: {
        id: `react-quality-gates/${locale}`,
        body: "import Note from './note';\n\n## Why\n\nBecause.",
        data: {
          title: `Title ${locale}`,
          description: 'How the pipeline keeps a React app honest.',
          published: new Date('2026-10-01T00:00:00Z'),
          updated: undefined,
          tags: ['react'],
          draft: false,
        },
      },
    },
  ],
}));

describe('loadMcpPosts', () => {
  it('reads the Posts of both languages as plain Markdown', async () => {
    const posts = await loadMcpPosts();

    expect(posts.de[0]?.title).toBe('Title de');
    expect(posts.en[0]).toEqual({
      slug: 'react-quality-gates',
      title: 'Title en',
      description: 'How the pipeline keeps a React app honest.',
      published: new Date('2026-10-01T00:00:00Z'),
      updated: undefined,
      tags: ['react'],
      readingMinutes: 6,
      body: '## Why\n\nBecause.',
    });
  });
});
