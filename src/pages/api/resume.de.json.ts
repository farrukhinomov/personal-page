import type { APIRoute } from 'astro';
import { buildResume } from '@/seo/resume';

/** The CV in German, as JSON Resume. The English version at /api/resume.json is canonical. */
export const GET: APIRoute = () => Response.json(buildResume('de'));
