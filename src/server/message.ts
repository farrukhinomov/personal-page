import { z } from 'astro/zod';
import { LOCALES, type Localized } from '@/i18n/locales';

/** What a Message is about. */
export const TOPICS = ['job', 'freelance', 'question', 'other'] as const;

export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABELS: Readonly<Record<Topic, Localized>> = {
  job: { de: 'Stellenangebot', en: 'Job offer' },
  freelance: { de: 'Freelance-Projekt', en: 'Freelance project' },
  question: { de: 'Frage zu einem Projekt oder Post', en: 'Question about a project or post' },
  other: { de: 'Sonstiges', en: 'Other' },
};

/** Field limits, shared by the server schema and the form's HTML constraints. */
export const MESSAGE_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  company: { max: 100 },
  message: { min: 20, max: 5000 },
} as const;

/** A line break in a name would end up in an email subject or header. */
const singleLine = z
  .string()
  .trim()
  .regex(/^[^\r\n]*$/);

export const messageSchema = z.object({
  name: singleLine.min(MESSAGE_LIMITS.name.min).max(MESSAGE_LIMITS.name.max),
  email: z.email().trim().max(MESSAGE_LIMITS.email.max),
  company: singleLine.max(MESSAGE_LIMITS.company.max).default(''),
  topic: z.enum(TOPICS),
  message: z.string().trim().min(MESSAGE_LIMITS.message.min).max(MESSAGE_LIMITS.message.max),
  consent: z.literal(true),
  /** The page's language, used for the confirmation to the sender. */
  locale: z.enum(LOCALES),
  turnstileToken: z.string().min(1).max(2048),
});

export type Message = z.infer<typeof messageSchema>;

/** Hidden field that people never see and bots tend to fill. */
export const HONEYPOT_FIELD = 'website';

export type ParsedMessage =
  { kind: 'message'; message: Message } | { kind: 'bot' } | { kind: 'invalid'; fields: string[] };

/** Validates a submitted form; a filled honeypot marks the sender as a bot. */
export function parseMessage(body: unknown): ParsedMessage {
  if (isRecord(body) && typeof body[HONEYPOT_FIELD] === 'string' && body[HONEYPOT_FIELD] !== '') {
    return { kind: 'bot' };
  }
  const result = messageSchema.safeParse(body);
  if (result.success) return { kind: 'message', message: result.data };
  const fields = new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'body')));
  return { kind: 'invalid', fields: [...fields] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
