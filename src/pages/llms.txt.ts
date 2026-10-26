import type { APIRoute } from 'astro';
import { getPostSummaries } from '@/blog/summaries';
import { buildLlmsTxt } from '@/seo/llms';

export const GET: APIRoute = async () =>
  new Response(buildLlmsTxt(await getPostSummaries('en')), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
