import { profile } from '@/data/profile';
import { formatSize, type Attachment } from './attachments';
import { confirmationFor, confirmationText } from './confirmation';
import { confirmationHtml } from './confirmation-html';
import { TOPIC_LABELS, type Message } from './message';

/** Verified in Resend for inomov.online. */
export const SENDER = `${profile.name} <contact@inomov.online>`;

export interface Email {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  /** Optional rich version; mail apps that cannot show it fall back to `text`. */
  html?: string;
  attachments?: readonly Attachment[];
}

/** What a notification needs of a Message, from the Contact page form or an AI assistant. */
export type MessageContent = Pick<
  Message,
  'name' | 'email' | 'company' | 'topic' | 'message' | 'locale'
>;

/** Where a Message came from: the Contact page form, or an AI assistant through /api/mcp. */
export type MessageChannel = 'form' | 'assistant';

const CHANNEL_LABELS: Record<MessageChannel, string> = {
  form: 'Kontaktformular',
  assistant: 'KI-Assistent (MCP); Name und E-Mail-Adresse sind nicht bestätigt',
};

/** The Message as it reaches Farrukh; replying goes straight to the sender. */
export function notificationEmail(
  message: MessageContent,
  attachments: readonly Attachment[] = [],
  channel: MessageChannel = 'form',
): Email {
  const topic = TOPIC_LABELS[message.topic].de;
  const listed = attachments.map((file) => `${file.filename} (${formatSize(file.content.length)})`);
  const via = channel === 'assistant' ? 'einen KI-Assistenten' : 'inomov.online';
  return {
    from: SENDER,
    to: profile.email,
    replyTo: message.email,
    subject: `Nachricht über ${via}: ${topic} von ${message.name}`,
    text: [
      `Name: ${message.name}`,
      `E-Mail: ${message.email}`,
      `Firma: ${message.company || '–'}`,
      `Thema: ${topic}`,
      `Sprache: ${message.locale}`,
      `Eingang: ${CHANNEL_LABELS[channel]}`,
      `Anhänge: ${listed.join(', ') || '–'}`,
      '',
      message.message,
    ].join('\n'),
    ...(attachments.length > 0 ? { attachments } : {}),
  };
}

/** Tells the sender their Message arrived, as HTML with a plain-text twin (see confirmation.ts). */
export function confirmationEmail(message: Message): Email {
  const confirmation = confirmationFor(message);
  return {
    from: SENDER,
    to: message.email,
    replyTo: profile.email,
    subject: confirmation.subject,
    text: confirmationText(confirmation),
    html: confirmationHtml(confirmation),
  };
}

const RESEND_URL = 'https://api.resend.com/emails';

/** Sends one email through the Resend API; throws when Resend refuses it. */
export async function sendEmail(
  apiKey: string,
  email: Email,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: email.from,
      to: [email.to],
      reply_to: email.replyTo,
      subject: email.subject,
      text: email.text,
      ...(email.html ? { html: email.html } : {}),
      ...(email.attachments
        ? {
            attachments: email.attachments.map((file) => ({
              filename: file.filename,
              content: Buffer.from(file.content).toString('base64'),
              content_type: file.contentType,
            })),
          }
        : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend answered ${response.status}: ${await response.text()}`);
  }
}
