import { describe, expect, it, vi } from 'vitest';
import { profile } from '@/data/profile';
import type { Message } from './message';
import { confirmationEmail, notificationEmail, sendEmail, SENDER } from './message-mail';

const message: Message = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: '',
  topic: 'freelance',
  message: 'Could you help us move a WinForms app to Blazor?',
  consent: true,
  locale: 'de',
  turnstileToken: 'token',
};

describe('notificationEmail', () => {
  it('reaches Farrukh with the whole Message and replies to the sender', () => {
    const email = notificationEmail(message);

    expect(email).toMatchObject({ from: SENDER, to: profile.email, replyTo: 'ada@example.com' });
    expect(email.subject).toBe('Nachricht über inomov.online: Freelance-Projekt von Ada Lovelace');
    expect(email.text).toContain('Firma: –');
    expect(email.text).toContain('Anhänge: –');
    expect(email.text).toContain(message.message);
    expect(email.attachments).toBeUndefined();
  });

  it('lists and carries the attachments', () => {
    const email = notificationEmail(message, [ATTACHMENT]);

    expect(email.text).toContain('Anhänge: role.pdf (1 KB)');
    expect(email.attachments).toEqual([ATTACHMENT]);
  });
});

const ATTACHMENT = {
  filename: 'role.pdf',
  contentType: 'application/pdf',
  content: new TextEncoder().encode('%PDF-1.7'),
};

describe('confirmationEmail', () => {
  it.each([
    [
      'de',
      'Eingangsbestätigung: Ihre Nachricht an Farrukh Inomov',
      'Guten Tag Ada Lovelace,',
      '„Freelance-Projekt“',
    ],
    [
      'en',
      'Confirmation: your message to Farrukh Inomov',
      'Dear Ada Lovelace,',
      '“Freelance project”',
    ],
  ] as const)('confirms in the page language (%s)', (locale, subject, greeting, topic) => {
    const email = confirmationEmail({ ...message, locale });

    expect(email).toMatchObject({ from: SENDER, to: 'ada@example.com', replyTo: profile.email });
    expect(email.subject).toBe(subject);
    expect(email.text.startsWith(`${greeting}\n`)).toBe(true);
    expect(email.text).toContain(topic);
    expect(email.text).toContain(profile.links.linkedin);
    expect(email.html).toContain(`<html lang="${locale}">`);
  });

  it('greets neutrally when the name cannot be repeated safely', () => {
    expect(confirmationEmail({ ...message, name: 'Visit spam.example' }).text).toMatch(
      /^Guten Tag,\n/,
    );
    expect(confirmationEmail({ ...message, name: 'x1', locale: 'en' }).text).toMatch(/^Hello,\n/);
  });

  it('never repeats what the sender wrote, so it cannot carry spam', () => {
    const email = confirmationEmail({ ...message, name: 'Visit spam.example', locale: 'en' });

    expect(email.text).not.toContain(message.message);
    expect(email.text).not.toContain('spam.example');
    expect(email.subject).not.toContain('spam.example');
    expect(email.html).not.toContain('spam.example');
  });
});

describe('sendEmail', () => {
  it('posts a plain-text email to Resend with the API key', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: '1' }));

    await sendEmail('re_test', notificationEmail(message), fetcher);

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('https://api.resend.com/emails');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer re_test');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      from: SENDER,
      to: [profile.email],
      reply_to: 'ada@example.com',
    });
  });

  it('sends attachments base64-encoded with their checked type', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: '1' }));

    await sendEmail('re_test', notificationEmail(message, [ATTACHMENT]), fetcher);

    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body.attachments).toEqual([
      { filename: 'role.pdf', content: btoa('%PDF-1.7'), content_type: 'application/pdf' },
    ]);
  });

  it('throws with Resend’s answer when the email is refused', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('domain not verified', { status: 403 }));

    await expect(sendEmail('re_test', notificationEmail(message), fetcher)).rejects.toThrow(
      'Resend answered 403: domain not verified',
    );
  });
});
