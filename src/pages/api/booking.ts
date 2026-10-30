import type { APIRoute } from 'astro';
import { handleBooking } from '@/server/booking-handler';
import { createBooking, fetchSlots } from '@/server/calcom';
import { readJson } from '@/server/request';
import { requiredSecret } from '@/server/secrets';
import { verifyTurnstile } from '@/server/turnstile';
import { countUsage, rateLimit } from '@/server/upstash';

/** Runs as a Vercel function; every other page is static. */
export const prerender = false;

/** Requests an Intro Call from the Contact page form (issue #10). */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const json = await readJson(request);
  if (!json.ok) return json.response;

  const turnstileSecret = requiredSecret('TURNSTILE_SECRET_KEY');
  const calcomKey = requiredSecret('CALCOM_API_KEY');
  return handleBooking(json.body, clientAddress, {
    verifyTurnstile: (token, ip) => verifyTurnstile(turnstileSecret, token, ip),
    rateLimit: (ip) => rateLimit('booking', ip),
    slots: (range) => fetchSlots(calcomKey, range),
    book: (booking) => createBooking(calcomKey, booking),
    count: countUsage,
  });
};
