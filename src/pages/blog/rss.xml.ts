import type { APIRoute } from 'astro';
import { blogFeed } from '@/blog/rss';

export const GET: APIRoute = () => blogFeed('de');
