import type { Localized } from '@/i18n/locales';

/** Copy both Contact page forms share, so the Message form and the booking form read alike. */
export const FORM_COPY: Localized<{
  name: string;
  email: string;
  consentLink: string;
  noscript: string;
  errors: {
    name: { missing: string; short: string };
    email: { missing: string; invalid: string };
  };
  status: { verifying: string; invalid: string; verification_failed: string };
}> = {
  de: {
    name: 'Name',
    email: 'E-Mail',
    consentLink: 'Datenschutzerklärung',
    noscript: 'Das Formular braucht JavaScript. Schreiben Sie mir stattdessen an',
    errors: {
      name: { missing: 'Bitte geben Sie Ihren Namen an.', short: 'Der Name ist zu kurz.' },
      email: {
        missing: 'Bitte geben Sie Ihre E-Mail-Adresse an.',
        invalid: 'Diese E-Mail-Adresse ist ungültig.',
      },
    },
    status: {
      verifying: 'Sicherheitsprüfung läuft …',
      invalid: 'Bitte prüfen Sie die markierten Felder.',
      verification_failed:
        'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
    },
  },
  en: {
    name: 'Name',
    email: 'Email',
    consentLink: 'privacy policy',
    noscript: 'The form needs JavaScript. Please write to me instead at',
    errors: {
      name: { missing: 'Please enter your name.', short: 'The name is too short.' },
      email: {
        missing: 'Please enter your email address.',
        invalid: 'This email address is not valid.',
      },
    },
    status: {
      verifying: 'Running the security check …',
      invalid: 'Please check the marked fields.',
      verification_failed: 'The security check failed. Please try again.',
    },
  },
};
