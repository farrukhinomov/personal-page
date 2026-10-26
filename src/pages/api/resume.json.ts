import type { APIRoute } from 'astro';
import { buildResume } from '@/seo/resume';

/** The CV as JSON Resume, prerendered at build time. */
export const GET: APIRoute = () => Response.json(buildResume('en'));
