import type { APIRoute } from 'astro';
import { handleSlots } from '@/server/booking-handler';
import { fetchSlots } from '@/server/calcom';
import { requiredSecret } from '@/server/secrets';

/** Runs as a Vercel function; every other page is static. */
export const prerender = false;

/** Free Intro Call Slots for the Contact page (issue #10). */
export const GET: APIRoute = () => {
  const apiKey = requiredSecret('CALCOM_API_KEY');
  return handleSlots((range) => fetchSlots(apiKey, range));
};
