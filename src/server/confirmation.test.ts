import { describe, expect, it } from 'vitest';
import { confirmationFor, confirmationText, greetingName } from './confirmation';
import { confirmationHtml, escapeHtml } from './confirmation-html';
import type { Message } from './message';

const message: Message = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: '',
  topic: 'job',
  message: 'Secret text the sender wrote.',
  consent: true,
  locale: 'de',
  turnstileToken: 'token',
};

describe('greetingName', () => {
  it.each([
    'Ada Lovelace',
    'Dr. Jürgen Müller-Lüdenscheidt',
    "Seán O'Brien",
    'Zoë  Ştefan',
    'Фаррух Иномов',
  ])('keeps the real name %s', (name) => {
    expect(greetingName(name)).toBe(name.replace(/\s+/g, ' '));
  });

  it.each([
    'Visit spam.example',
    'https://spam.example',
    'ada@example.com',
    'Agent 007',
    'Win $1000 now!',
    'a'.repeat(61),
  ])('refuses %s', (name) => {
    expect(greetingName(name)).toBeUndefined();
  });
});

describe('confirmationText', () => {
  it('opens with the greeting and closes with the signature and notice', () => {
    const text = confirmationText(confirmationFor(message));

    expect(text.startsWith('Guten Tag Ada Lovelace,\n\nvielen Dank')).toBe(true);
    expect(text).toContain('„Stellenangebot“');
    expect(text).toContain('Mit freundlichen Grüßen\n\nFarrukh Inomov\n');
    expect(text).toMatch(/Falls Sie das nicht waren, können Sie sie ignorieren\.$/);
  });
});

describe('confirmationHtml', () => {
  it.each(['de', 'en'] as const)('renders the same content as the text version (%s)', (locale) => {
    const confirmation = confirmationFor({ ...message, locale });
    const html = confirmationHtml(confirmation);

    expect(html).toContain(`<html lang="${locale}">`);
    for (const part of [
      confirmation.status,
      confirmation.greeting,
      confirmation.followUp,
      confirmation.closing,
      confirmation.signature.headline,
    ]) {
      expect(html).toContain(escapeHtml(part));
    }
    expect(html).toContain(escapeHtml(confirmation.topic));
    expect(html).toContain(`href="${confirmation.signature.linkedin}"`);
    expect(html).not.toContain(message.message);
  });

  it('has no images, scripts or external styles', () => {
    const html = confirmationHtml(confirmationFor(message));

    expect(html).not.toMatch(/<img|<script|<link/i);
  });
});

describe('escapeHtml', () => {
  it('escapes the characters that could open a tag or an attribute', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;',
    );
  });
});
