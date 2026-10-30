import type { APIRoute } from 'astro';
import { renderFaviconIco } from '@/seo/icons';

export const GET: APIRoute = () =>
  new Response(Buffer.from(renderFaviconIco()), { headers: { 'Content-Type': 'image/x-icon' } });
