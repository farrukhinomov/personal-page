import { z } from 'astro/zod';
import type { Localized } from '@/i18n/locales';
import { formFields, parseSubmission, SENDER_LIMITS, senderFields, singleLine } from './submission';

export { HONEYPOT_FIELD } from './submission';

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
  ...SENDER_LIMITS,
  message: { min: 20, max: 5000 },
} as const;

export const messageSchema = z.object({
  ...senderFields,
  company: singleLine.max(MESSAGE_LIMITS.company.max).default(''),
  topic: z.enum(TOPICS),
  message: z.string().trim().min(MESSAGE_LIMITS.message.min).max(MESSAGE_LIMITS.message.max),
  ...formFields,
});

export type Message = z.infer<typeof messageSchema>;

export type ParsedMessage =
  { kind: 'message'; message: Message } | { kind: 'bot' } | { kind: 'invalid'; fields: string[] };

/** Validates a submitted Message; a filled honeypot marks the sender as a bot. */
export function parseMessage(body: unknown): ParsedMessage {
  const parsed = parseSubmission(messageSchema, body);
  return parsed.kind === 'valid' ? { kind: 'message', message: parsed.value } : parsed;
}
