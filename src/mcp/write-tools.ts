import type { McpServer, ToolAnnotations } from '@modelcontextprotocol/server';
import { z } from 'astro/zod';
import { profile } from '@/data/profile';
import type { Locale } from '@/i18n/locales';
import { pathFor } from '@/i18n/routes';
import { BOOKING_WINDOW_DAYS, bookingSchema } from '@/server/booking';
import { requestIntroCall } from '@/server/booking-handler';
import type { BookingOutcome, BookingRequest } from '@/server/calcom';
import { HOST_TIME_ZONE } from '@/server/calcom';
import { messageSchema, TOPICS } from '@/server/message';
import { notificationEmail, type Email } from '@/server/message-mail';
import { ALL_CLIENTS, type RateLimitedAction, type RateLimitResult } from '@/server/rate-limit';
import { SITE_URL } from '@/seo/structured-data';
import { langInput } from './schemas';

/** The outside world the write tools touch, injected so tests run without network. */
export interface WriteServices {
  /** The caller's address, for the daily limits. */
  ip: string;
  rateLimit(action: RateLimitedAction, key: string): Promise<RateLimitResult>;
  send(email: Email): Promise<void>;
  /** Free Slots in the booking window; may be cached briefly. */
  listSlots(): Promise<string[]>;
  /** Free Slots in a range, fresh from Cal.com, to check a chosen Slot before booking it. */
  slots(range: { from: Date; to: Date }): Promise<string[]>;
  book(booking: BookingRequest): Promise<BookingOutcome>;
}

/** Calls Cal.com, but changes nothing. */
const READS_CALENDAR: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

/** Sends something to Farrukh; hosts ask their user before calling such a tool. */
const SENDS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

const SLOT_TAKEN = 'This time is not free. Call get_available_slots and pick another.';

/** Shown to Farrukh below the reason, so he knows who filled in the details. */
const ASSISTANT_NOTE = 'Angefragt über einen KI-Assistenten (MCP).';

const timeZoneInput = bookingSchema.shape.timeZone.describe(
  'IANA time zone of the user, e.g. "Europe/Berlin" or "America/New_York".',
);

const messageInput = z.object({
  name: messageSchema.shape.name.describe('Full name of the person writing'),
  email: messageSchema.shape.email.describe('Email address Farrukh replies to'),
  company: messageSchema.shape.company.describe('Company, if any'),
  topic: z
    .enum(TOPICS)
    .describe('job: a job offer; freelance: a project; question: about a project or post; other'),
  message: messageSchema.shape.message.describe('The message itself, 20 to 5000 characters'),
  lang: langInput.describe('Language the message is written in: "de" or "en".'),
});

const bookingInput = z.object({
  name: bookingSchema.shape.name.describe('Full name of the person who will join the call'),
  email: bookingSchema.shape.email.describe('Cal.com sends the invitation to this address'),
  company: bookingSchema.shape.company.describe('Company the person works for'),
  reason: bookingSchema.shape.reason.describe('What the call is about, 10 to 1000 characters'),
  link: bookingSchema.shape.link.describe('Optional link, e.g. to the job posting'),
  start: bookingSchema.shape.start.describe('Start of a free slot from get_available_slots'),
  timeZone: timeZoneInput,
  lang: langInput.describe('Language of the invitation: "de" or "en".'),
});

const slotsOutput = z.object({
  timeZone: z.string(),
  windowDays: z.number(),
  slots: z.array(z.object({ start: z.string(), label: z.string() })),
});

const sentOutput = z.object({ status: z.literal('sent') });

const requestedOutput = z.object({
  status: z.literal('requested'),
  start: z.string(),
  label: z.string(),
});

function result<T extends Record<string, unknown>>(value: T, summary: string) {
  return {
    content: [{ type: 'text' as const, text: `${summary}\n${JSON.stringify(value)}` }],
    structuredContent: value,
  };
}

function failure(text: string) {
  return { content: [{ type: 'text' as const, text }], isError: true };
}

/** Where a person can always reach Farrukh when a tool cannot. */
function fallback(locale: Locale): string {
  const contact = new URL(pathFor('contact', locale), SITE_URL).href;
  return `Use the contact page ${contact} or email ${profile.email}.`;
}

/** A slot as people read it, e.g. "Thu, Oct 29, 5:00 PM". */
function slotLabel(start: string, locale: Locale, timeZone: string): string {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(start));
}

/**
 * Both limits must allow the request: the caller's own and the one for all assistants. Without a
 * known address the caller's limit cannot count, so the request is refused.
 */
async function withinLimits(
  services: WriteServices,
  perClient: RateLimitedAction,
  total: RateLimitedAction,
): Promise<boolean> {
  if (!services.ip) return false;
  if (!(await services.rateLimit(perClient, services.ip)).allowed) return false;
  return (await services.rateLimit(total, ALL_CLIENTS)).allowed;
}

/**
 * The tools that reach Farrukh: a Message to his inbox and an Intro Call request in Cal.com. They
 * check input like the Contact page forms, but instead of Turnstile they have stricter limits,
 * and Messages get no confirmation email: an assistant could name any address, and its user sees
 * the result in the chat.
 */
export function registerWriteTools(server: McpServer, services: WriteServices): void {
  server.registerTool(
    'get_available_slots',
    {
      title: 'Free intro call times',
      description: `Free times for a 30-minute intro call on Google Meet in the next ${BOOKING_WINDOW_DAYS} days. Pass one as start to book_call.`,
      inputSchema: z.object({ lang: langInput, timeZone: timeZoneInput.default(HOST_TIME_ZONE) }),
      outputSchema: slotsOutput,
      annotations: READS_CALENDAR,
    },
    async ({ lang, timeZone }) => {
      try {
        const free = await services.listSlots();
        const value = {
          timeZone,
          windowDays: BOOKING_WINDOW_DAYS,
          slots: free.map((start) => ({ start, label: slotLabel(start, lang, timeZone) })),
        };
        const summary =
          free.length > 0
            ? `${free.length} free times, shown in ${timeZone}.`
            : `No time is free in the next ${BOOKING_WINDOW_DAYS} days. ${fallback(lang)}`;
        return result(value, summary);
      } catch (error) {
        console.error('Loading Slots for an assistant failed.', error);
        return failure(`The free times could not be loaded. ${fallback(lang)}`);
      }
    },
  );

  server.registerTool(
    'send_message',
    {
      title: 'Send Farrukh a message',
      description:
        'Sends a message to Farrukh by email, e.g. a job offer or a project inquiry. He replies to the given address, usually within two working days. Confirm the content with the user first.',
      inputSchema: messageInput,
      outputSchema: sentOutput,
      annotations: SENDS,
    },
    async ({ lang, ...message }) => {
      try {
        if (!(await withinLimits(services, 'mcpMessage', 'mcpMessageTotal'))) {
          return failure(
            `No more messages can be sent through assistants today. ${fallback(lang)}`,
          );
        }
        await services.send(notificationEmail({ ...message, locale: lang }, [], 'assistant'));
      } catch (error) {
        console.error('Delivering a Message from an assistant failed.', error);
        return failure(`The message could not be sent. ${fallback(lang)}`);
      }
      return result(
        { status: 'sent' as const },
        `Sent. Farrukh replies to ${message.email}, usually within two working days.`,
      );
    },
  );

  server.registerTool(
    'book_call',
    {
      title: 'Request an intro call',
      description:
        'Requests a 30-minute intro call at a free time from get_available_slots. Farrukh confirms every request; Cal.com then emails the Google Meet invitation. Confirm the details with the user first.',
      inputSchema: bookingInput,
      outputSchema: requestedOutput,
      annotations: SENDS,
    },
    async ({ lang, ...booking }) => {
      try {
        // A time that is not even offered is refused before it uses up a daily limit.
        const offered = await services.listSlots();
        if (!offered.includes(new Date(booking.start).toISOString())) {
          return failure(SLOT_TAKEN);
        }
        if (!(await withinLimits(services, 'booking', 'mcpBookingTotal'))) {
          return failure(
            `No more calls can be requested through assistants today. ${fallback(lang)}`,
          );
        }
        const outcome = await requestIntroCall(
          { ...booking, language: lang, note: ASSISTANT_NOTE },
          services,
        );
        if (outcome === 'slot_unavailable') return failure(SLOT_TAKEN);
      } catch (error) {
        console.error('Booking an Intro Call for an assistant failed.', error);
        return failure(`The call could not be requested. ${fallback(lang)}`);
      }
      const label = slotLabel(booking.start, lang, booking.timeZone);
      return result(
        { status: 'requested' as const, start: booking.start, label },
        `Requested for ${label} (${booking.timeZone}). Farrukh confirms it, then Cal.com emails the invitation to ${booking.email}.`,
      );
    },
  );
}
