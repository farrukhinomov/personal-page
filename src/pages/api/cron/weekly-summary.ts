import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { sendEmail } from '@/server/message-mail';
import { requiredSecret } from '@/server/secrets';
import { handleWeeklySummary } from '@/server/usage-summary';
import { readUsage } from '@/server/upstash';

/** Runs as a Vercel function; every other page is static. */
export const prerender = false;

/** The weekly summary email, started by the Vercel cron job in vercel.json (issue #75). */
export const GET: APIRoute = ({ request }) =>
  handleWeeklySummary(request, {
    secret: getSecret('CRON_SECRET'),
    read: readUsage,
    send: (email) => sendEmail(requiredSecret('RESEND_API_KEY'), email),
  });
