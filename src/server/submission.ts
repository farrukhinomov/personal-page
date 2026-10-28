import { z } from 'astro/zod';
import { LOCALES } from '@/i18n/locales';

/**
 * Building blocks every Contact page form shares: the sender, consent, page language and bot
 * check, and parsing a submission with its honeypot.
 */

/** Limits of the sender fields, shared by the server schemas and the forms' HTML constraints. */
export const SENDER_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  company: { max: 100 },
} as const;

/** A line break in a name would end up in an email subject or header. */
export const singleLine = z
  .string()
  .trim()
  .regex(/^[^\r\n]*$/);

export const senderFields = {
  name: singleLine.min(SENDER_LIMITS.name.min).max(SENDER_LIMITS.name.max),
  email: z.email().trim().max(SENDER_LIMITS.email.max),
};

export const formFields = {
  consent: z.literal(true),
  /** The page's language, used for everything the sender receives. */
  locale: z.enum(LOCALES),
  turnstileToken: z.string().min(1).max(2048),
};

/** Hidden field that people never see and bots tend to fill. */
export const HONEYPOT_FIELD = 'website';

export type Parsed<T> =
  { kind: 'valid'; value: T } | { kind: 'bot' } | { kind: 'invalid'; fields: string[] };

/** Validates a submitted form; a filled honeypot marks the sender as a bot. */
export function parseSubmission<T>(schema: z.ZodType<T>, body: unknown): Parsed<T> {
  if (isRecord(body) && typeof body[HONEYPOT_FIELD] === 'string' && body[HONEYPOT_FIELD] !== '') {
    return { kind: 'bot' };
  }
  const result = schema.safeParse(body);
  if (result.success) return { kind: 'valid', value: result.data };
  const fields = new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'body')));
  return { kind: 'invalid', fields: [...fields] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
