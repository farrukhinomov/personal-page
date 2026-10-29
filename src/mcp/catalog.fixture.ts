import type { McpPost } from './catalog';

/** One Post, for tests that do not read the blog collection. */
export const POSTS: McpPost[] = [
  {
    slug: 'react-quality-gates',
    title: 'Quality gates for React',
    description: 'How the pipeline keeps a React app honest.',
    published: new Date('2026-10-01T00:00:00Z'),
    updated: new Date('2026-10-12T00:00:00Z'),
    tags: ['react', 'ci'],
    readingMinutes: 6,
    body: '## Why\n\nBecause.',
  },
];
