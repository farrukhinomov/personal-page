import type { APIRoute } from 'astro';
import { buildRobotsTxt } from '@/seo/robots';

export const GET: APIRoute = () =>
  new Response(buildRobotsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
