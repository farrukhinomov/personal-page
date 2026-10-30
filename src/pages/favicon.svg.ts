import type { APIRoute } from 'astro';
import { iconSvg } from '@/seo/icons';

export const GET: APIRoute = () =>
  new Response(iconSvg('rounded'), { headers: { 'Content-Type': 'image/svg+xml' } });
