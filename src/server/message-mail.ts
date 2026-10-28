import { profile } from '@/data/profile';
import type { Localized } from '@/i18n/locales';
import { TOPIC_LABELS, type Message } from './message';

/** Verified in Resend for inomov.online. */
export const SENDER = `${profile.name} <contact@inomov.online>`;

export interface Email {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
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

const CONFIRMATION: Localized<{ subject: string; body: (topic: string) => string }> = {
  de: {
    subject: 'Ihre Nachricht an Farrukh Inomov',
    body: (topic) =>
      [
        'Hallo,',
        '',
        `vielen Dank für Ihre Nachricht zum Thema „${topic}“. Sie ist bei mir angekommen, und ich melde mich in der Regel innerhalb von zwei Werktagen.`,
        '',
        'Viele Grüße',
        profile.name,
        'https://inomov.online',
      ].join('\n'),
  },
  en: {
    subject: 'Your message to Farrukh Inomov',
    body: (topic) =>
      [
        'Hello,',
        '',
        `thank you for your message about "${topic}". It has reached me, and I usually reply within two working days.`,
        '',
        'Best regards,',
        profile.name,
        'https://inomov.online/en',
      ].join('\n'),
  },
};

/**
 * Tells the sender their Message arrived, in the page's language. It never repeats what they
 * wrote: otherwise anyone could send any text to any address from inomov.online.
 */
export function confirmationEmail(message: Message): Email {
  const copy = CONFIRMATION[message.locale];
  return {
    from: SENDER,
    to: message.email,
    replyTo: profile.email,
    subject: copy.subject,
    text: copy.body(TOPIC_LABELS[message.topic][message.locale]),
  };
}

const RESEND_URL = 'https://api.resend.com/emails';

/** Sends one plain-text email through the Resend API; throws when Resend refuses it. */
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
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend answered ${response.status}: ${await response.text()}`);
  }
}
