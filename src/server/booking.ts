import { z } from 'astro/zod';
import { formFields, parseSubmission, SENDER_LIMITS, senderFields, singleLine } from './submission';

/** Field limits, shared by the server schema and the booking form's HTML constraints. */
export const BOOKING_LIMITS = {
  ...SENDER_LIMITS,
  company: { min: 2, max: 100 },
  reason: { min: 10, max: 1000 },
  link: { max: 500 },
} as const;

/** How many days ahead the Contact page offers Slots. */
export const BOOKING_WINDOW_DAYS = 30;

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const bookingSchema = z.object({
  ...senderFields,
  company: singleLine.min(BOOKING_LIMITS.company.min).max(BOOKING_LIMITS.company.max),
  reason: z.string().trim().min(BOOKING_LIMITS.reason.min).max(BOOKING_LIMITS.reason.max),
  /** Optional, e.g. the job posting the call is about. */
  link: z
    .literal('')
    .or(z.url({ protocol: /^https?$/ }).max(BOOKING_LIMITS.link.max))
    .default(''),
  /** Start of the chosen Slot, as offered by /api/slots. */
  start: z.iso.datetime({ offset: true }),
  /** The Visitor's time zone, so Cal.com writes their invitation in local time. */
  timeZone: z.string().max(64).refine(isTimeZone),
  ...formFields,
});

export type Booking = z.infer<typeof bookingSchema>;

export function parseBooking(body: unknown) {
  return parseSubmission(bookingSchema, body);
}
