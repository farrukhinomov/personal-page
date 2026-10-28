import { BOOKING_WINDOW_DAYS, parseBooking } from './booking';
import type { BookingOutcome, BookingRequest } from './calcom';
import type { RateLimitResult } from './rate-limit';
import { rateLimitedResponse } from './rate-limit';
import { errorResponse, okResponse } from './responses';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The outside world a booking touches, injected so tests run without network. */
export interface BookingServices {
  verifyTurnstile(token: string, ip: string): Promise<boolean>;
  rateLimit(ip: string): Promise<RateLimitResult>;
  slots(range: { from: Date; to: Date }): Promise<string[]>;
  book(booking: BookingRequest): Promise<BookingOutcome>;
}

/** The days the Contact page offers: from today for the booking window. */
export function bookingWindow(now: Date): { from: Date; to: Date } {
  return { from: now, to: new Date(now.getTime() + BOOKING_WINDOW_DAYS * DAY_MS) };
}

/** Free Slots for the Contact page. A short CDN cache keeps Cal.com from being asked per view. */
export async function handleSlots(
  slots: BookingServices['slots'],
  now: Date = new Date(),
): Promise<Response> {
  try {
    const free = await slots(bookingWindow(now));
    return Response.json(
      { ok: true, slots: free },
      {
        headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
      },
    );
  } catch (error) {
    console.error('Loading Slots from Cal.com failed.', error);
    return errorResponse(502, 'slots_unavailable', 'Free times could not be loaded.');
  }
}

/**
 * Handles one Intro Call request. Cheap checks run first; a booking counts against the daily
 * limit only once Turnstile has passed. The Slot is checked against Cal.com again, so only times
 * Cal.com itself offers can be booked, whatever the request says.
 */
export async function handleBooking(
  body: unknown,
  ip: string,
  services: BookingServices,
): Promise<Response> {
  const parsed = parseBooking(body);
  // Bots get the same answer as people, so they cannot tell the honeypot caught them.
  if (parsed.kind === 'bot') return okResponse();
  if (parsed.kind === 'invalid') {
    return errorResponse(422, 'invalid_input', 'Some fields are invalid.', {
      fields: parsed.fields,
    });
  }
  const booking = parsed.value;

  if (!(await services.verifyTurnstile(booking.turnstileToken, ip))) {
    return errorResponse(403, 'verification_failed', 'The bot check failed. Please try again.');
  }

  const limit = await services.rateLimit(ip);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  const start = new Date(booking.start);
  try {
    const free = await services.slots({ from: start, to: new Date(start.getTime() + DAY_MS) });
    if (!free.includes(start.toISOString())) return slotUnavailable();

    const outcome = await services.book({
      start: start.toISOString(),
      name: booking.name,
      email: booking.email,
      timeZone: booking.timeZone,
      language: booking.locale,
      company: booking.company,
      reason: booking.reason,
    });
    return outcome.kind === 'requested' ? okResponse() : slotUnavailable();
  } catch (error) {
    console.error('Booking an Intro Call failed.', error);
    return errorResponse(502, 'booking_failed', 'The Intro Call could not be booked.');
  }
}

function slotUnavailable(): Response {
  return errorResponse(409, 'slot_unavailable', 'This time is no longer free.');
}
