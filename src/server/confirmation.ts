import { profile } from '@/data/profile';
import type { Locale, Localized } from '@/i18n/locales';
import { TOPIC_LABELS, type Message } from './message';

/** One word of a name: letters, inner hyphens or apostrophes, and an optional closing dot ("Dr."). */
const NAME_WORD = String.raw`\p{L}[\p{L}\p{M}'’-]*\.?`;
const GREETABLE_NAME = new RegExp(`^${NAME_WORD}(?: ${NAME_WORD})*$`, 'u');
const MAX_GREETING_NAME = 60;

/**
 * The sender's name if it is safe to repeat in the greeting. Only letters and the punctuation of
 * real names pass, so no link, address or other text can be smuggled into the confirmation.
 */
export function greetingName(name: string): string | undefined {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (normalized.length > MAX_GREETING_NAME) return undefined;
  return GREETABLE_NAME.test(normalized) ? normalized : undefined;
}

/** Everything the confirmation says, shared by its plain-text and HTML versions. */
export interface Confirmation {
  locale: Locale;
  subject: string;
  /** Shown by mail apps next to the subject. */
  preview: string;
  status: string;
  topicLabel: string;
  topic: string;
  greeting: string;
  /** The thank-you sentence around the topic. */
  intro: { before: string; after: string };
  followUp: string;
  closing: string;
  signature: { name: string; headline: string; website: string; linkedin: string };
  notice: string;
}

type Copy = Omit<Confirmation, 'locale' | 'topic' | 'greeting' | 'signature'> & {
  greet: (name: string | undefined) => string;
  website: string;
};

const COPY: Localized<Copy> = {
  de: {
    subject: 'Eingangsbestätigung: Ihre Nachricht an Farrukh Inomov',
    preview:
      'Vielen Dank, Ihre Nachricht ist angekommen. Ich melde mich innerhalb von zwei Werktagen.',
    status: 'Ihre Nachricht ist angekommen',
    topicLabel: 'Thema',
    greet: (name) => (name ? `Guten Tag ${name},` : 'Guten Tag,'),
    intro: {
      before: 'vielen Dank für Ihre Nachricht zum Thema „',
      after: '“, die ich über inomov.online erhalten habe.',
    },
    followUp:
      'Ich melde mich in der Regel innerhalb von zwei Werktagen persönlich bei Ihnen. Möchten Sie in der Zwischenzeit etwas ergänzen, antworten Sie einfach auf diese E-Mail.',
    closing: 'Mit freundlichen Grüßen',
    website: 'https://inomov.online',
    notice:
      'Diese E-Mail wurde automatisch versendet, weil über das Kontaktformular auf inomov.online eine Nachricht mit dieser Adresse abgeschickt wurde. Falls Sie das nicht waren, können Sie sie ignorieren.',
  },
  en: {
    subject: 'Confirmation: your message to Farrukh Inomov',
    preview: 'Thank you, your message has arrived. I will get back to you within two working days.',
    status: 'Your message has arrived',
    topicLabel: 'Topic',
    greet: (name) => (name ? `Dear ${name},` : 'Hello,'),
    intro: {
      before: 'Thank you for your message about “',
      after: '”, which I received through inomov.online.',
    },
    followUp:
      'I usually get back to you personally within two working days. If you would like to add anything in the meantime, simply reply to this email.',
    closing: 'Kind regards,',
    website: 'https://inomov.online/en',
    notice:
      'This email was sent automatically because a message with this address was submitted through the contact form on inomov.online. If this was not you, you can ignore it.',
  },
};

/**
 * The confirmation for one Message, in the page's language. Apart from a name that passes
 * greetingName and the topic, which is one of four fixed labels, it never repeats what the
 * sender wrote: otherwise anyone could send any text to any address from inomov.online.
 */
export function confirmationFor(message: Message): Confirmation {
  const { greet, website, ...copy } = COPY[message.locale];
  return {
    ...copy,
    locale: message.locale,
    topic: TOPIC_LABELS[message.topic][message.locale],
    greeting: greet(greetingName(message.name)),
    signature: {
      name: profile.name,
      headline: profile.headline[message.locale],
      website,
      linkedin: profile.links.linkedin,
    },
  };
}

export function confirmationText(confirmation: Confirmation): string {
  const { intro, signature } = confirmation;
  return [
    confirmation.greeting,
    '',
    `${intro.before}${confirmation.topic}${intro.after}`,
    '',
    confirmation.followUp,
    '',
    confirmation.closing,
    '',
    signature.name,
    signature.headline,
    signature.website,
    signature.linkedin,
    '',
    '—',
    confirmation.notice,
  ].join('\n');
}
