import type { APIRoute } from 'astro';
import { handleMessage } from '@/server/message-handler';
import { sendEmail } from '@/server/message-mail';
import { readJsonWithFiles } from '@/server/request';
import { requiredSecret } from '@/server/secrets';
import { verifyTurnstile } from '@/server/turnstile';
import { countUsage, rateLimit } from '@/server/upstash';

/** Runs as a Vercel function; every other page is static. */
export const prerender = false;

/** Receives a Message from the Contact page form (issue #11). */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const submission = await readJsonWithFiles(request);
  if (!submission.ok) return submission.response;

  const turnstileSecret = requiredSecret('TURNSTILE_SECRET_KEY');
  const resendKey = requiredSecret('RESEND_API_KEY');
  return handleMessage(
    submission.body,
    clientAddress,
    {
      verifyTurnstile: (token, ip) => verifyTurnstile(turnstileSecret, token, ip),
      rateLimit: (ip) => rateLimit('message', ip),
      confirmationLimit: (email) => rateLimit('confirmation', email),
      send: (email) => sendEmail(resendKey, email),
      count: countUsage,
    },
    submission.files,
  );
};
