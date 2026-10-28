import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { handleMessage } from '@/server/message-handler';
import { sendEmail } from '@/server/message-mail';
import { errorResponse } from '@/server/responses';
import { verifyTurnstile } from '@/server/turnstile';
import { rateLimit } from '@/server/upstash';

/** Runs as a Vercel function; every other page is static. */
export const prerender = false;

/** Far above any valid Message (5,000 characters plus fields); larger bodies are not parsed. */
const MAX_BODY_BYTES = 16 * 1024;

/** Receives a Message from the Contact page form (issue #11). */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  // JSON only: a cross-site form cannot send it without a CORS preflight, which this route never allows.
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return errorResponse(415, 'unsupported_media_type', 'Send the Message as JSON.');
  }
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return errorResponse(413, 'payload_too_large', 'The Message is too large.');
  }
  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return errorResponse(413, 'payload_too_large', 'The Message is too large.');
    }
    body = JSON.parse(raw);
  } catch {
    return errorResponse(400, 'invalid_json', 'The request body is not valid JSON.');
  }

  const turnstileSecret = requiredSecret('TURNSTILE_SECRET_KEY');
  const resendKey = requiredSecret('RESEND_API_KEY');
  return handleMessage(body, clientAddress, {
    verifyTurnstile: (token, ip) => verifyTurnstile(turnstileSecret, token, ip),
    rateLimit: (ip) => rateLimit('message', ip),
    confirmationLimit: (email) => rateLimit('confirmation', email),
    send: (email) => sendEmail(resendKey, email),
  });
};

function requiredSecret(name: 'TURNSTILE_SECRET_KEY' | 'RESEND_API_KEY'): string {
  const value = getSecret(name);
  if (!value) throw new Error(`${name} must be set to receive Messages.`);
  return value;
}
