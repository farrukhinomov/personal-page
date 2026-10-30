import type { APIRoute } from 'astro';
import { APPLE_TOUCH_ICON_SIZE, renderIconPng } from '@/seo/icons';

export const GET: APIRoute = () =>
  new Response(Buffer.from(renderIconPng(APPLE_TOUCH_ICON_SIZE, 'square')), {
    headers: { 'Content-Type': 'image/png' },
  });
