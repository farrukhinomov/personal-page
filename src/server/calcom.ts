import { z } from 'astro/zod';

/**
 * The two Cal.com API v2 calls the Intro Call needs: free Slots and booking one. The event type
 * itself (Mon–Fri 17–19 Europe/Berlin, 24 h notice, approval required) is set up in Cal.com.
 */

const API = 'https://api.cal.com/v2';
/** Cal.com versions each endpoint by header; these are the versions the parsers below expect. */
const SLOTS_API_VERSION = '2024-09-04';
const BOOKINGS_API_VERSION = '2024-08-13';

/** The hidden "Intro Call" event type, bookable only through this site. */
export const INTRO_CALL_EVENT_TYPE_ID = 7669900;
export const INTRO_CALL_MINUTES = 30;
/** Farrukh's time zone; Slots are requested in it and shown in the Visitor's own. */
export const HOST_TIME_ZONE = 'Europe/Berlin';

const slotsResponse = z.object({
  data: z.record(z.string(), z.array(z.object({ start: z.string() }))),
});

const bookingResponse = z.object({
  data: z.object({ uid: z.string(), status: z.string() }),
});

/** Start times of free Slots between two days, as UTC ISO strings in ascending order. */
export async function fetchSlots(
  apiKey: string,
  range: { from: Date; to: Date },
  fetcher: typeof fetch = fetch,
): Promise<string[]> {
  const params = new URLSearchParams({
    eventTypeId: String(INTRO_CALL_EVENT_TYPE_ID),
    start: day(range.from),
    end: day(range.to),
    timeZone: HOST_TIME_ZONE,
  });
  const response = await fetcher(`${API}/slots?${params}`, {
    headers: headers(apiKey, SLOTS_API_VERSION),
  });
  if (!response.ok) throw new Error(`Cal.com slots answered ${response.status}`);
  const { data } = slotsResponse.parse(await response.json());
  return Object.values(data)
    .flat()
    .map((slot) => new Date(slot.start).toISOString())
    .sort();
}

export interface BookingRequest {
  /** UTC ISO start of a free Slot. */
  start: string;
  name: string;
  email: string;
  timeZone: string;
  language: string;
  company: string;
  reason: string;
}

export type BookingOutcome =
  { kind: 'requested'; uid: string } | { kind: 'refused'; status: number };

/**
 * Books an Intro Call. It stays pending until Farrukh approves it in Cal.com, which also sends the
 * emails. Cal.com refusing the booking (4xx, e.g. the Slot was just taken) is an outcome; anything
 * else throws.
 */
export async function createBooking(
  apiKey: string,
  booking: BookingRequest,
  fetcher: typeof fetch = fetch,
): Promise<BookingOutcome> {
  const response = await fetcher(`${API}/bookings`, {
    method: 'POST',
    headers: { ...headers(apiKey, BOOKINGS_API_VERSION), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start: booking.start,
      eventTypeId: INTRO_CALL_EVENT_TYPE_ID,
      attendee: {
        name: booking.name,
        email: booking.email,
        timeZone: booking.timeZone,
        language: booking.language,
      },
      bookingFieldsResponses: { company: booking.company, reason: booking.reason },
    }),
  });
  if (response.status >= 400 && response.status < 500) {
    console.error(`Cal.com refused a booking (${response.status}):`, await response.text());
    return { kind: 'refused', status: response.status };
  }
  if (!response.ok) throw new Error(`Cal.com bookings answered ${response.status}`);
  const { data } = bookingResponse.parse(await response.json());
  return { kind: 'requested', uid: data.uid };
}

function headers(apiKey: string, version: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}`, 'cal-api-version': version };
}

/** A calendar day as YYYY-MM-DD in the host's time zone. */
function day(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: HOST_TIME_ZONE }).format(date);
}
