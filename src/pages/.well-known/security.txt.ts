import type { APIRoute } from 'astro';
import { buildSecurityTxt } from '@/seo/security-txt';

/** Built with the site, so Expires counts from the build date (see src/seo/security-txt.ts). */
export const GET: APIRoute = () =>
  new Response(buildSecurityTxt(new Date(__BUILT_AT__)), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
