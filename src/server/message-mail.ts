import { profile } from '@/data/profile';
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
}

/** The Message as it reaches Farrukh; replying goes straight to the sender. */
export function notificationEmail(message: Message): Email {
  const topic = TOPIC_LABELS[message.topic].de;
  return {
    from: SENDER,
    to: profile.email,
    replyTo: message.email,
    subject: `Nachricht über inomov.online: ${topic} von ${message.name}`,
    text: [
      `Name: ${message.name}`,
      `E-Mail: ${message.email}`,
      `Firma: ${message.company || '–'}`,
      `Thema: ${topic}`,
      `Sprache: ${message.locale}`,
      '',
      message.message,
    ].join('\n'),
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
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend answered ${response.status}: ${await response.text()}`);
  }
}
