import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Posts live in `src/content/blog/<slug>/<locale>.mdx`.
 * Every Post must exist in both locales; see `src/blog/posts.ts`.
 */
const blog = defineCollection({
  loader: glob({ pattern: '*/{de,en}.mdx', base: './src/content/blog' }),
  schema: z
    .object({
      title: z.string().trim().min(1).max(90),
      /** Shown in lists, search results and link previews. */
      description: z.string().trim().min(50).max(160),
      published: z.coerce.date(),
      updated: z.coerce.date().optional(),
      tags: z.array(z.string().trim().min(1)).max(5).default([]),
      /** Drafts are visible in `astro dev` only. */
      draft: z.boolean().default(false),
    })
    .refine((post) => !post.updated || post.updated >= post.published, {
      error: '`updated` cannot be earlier than `published`',
      path: ['updated'],
    }),
});

export const collections = { blog };
