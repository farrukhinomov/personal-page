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
    expect(email.text).toContain(message.message);
  });
});

describe('confirmationEmail', () => {
  it.each([
    ['de', 'Ihre Nachricht an Farrukh Inomov', '„Freelance-Projekt“'],
    ['en', 'Your message to Farrukh Inomov', '"Freelance project"'],
  ] as const)('confirms in the page language (%s)', (locale, subject, topic) => {
    const email = confirmationEmail({ ...message, locale });

    expect(email).toMatchObject({ from: SENDER, to: 'ada@example.com', replyTo: profile.email });
    expect(email.subject).toBe(subject);
    expect(email.text).toContain(topic);
  });

  it('never repeats what the sender wrote, so it cannot carry spam', () => {
    const email = confirmationEmail({ ...message, name: 'Visit spam.example', locale: 'en' });

    expect(email.text).not.toContain(message.message);
    expect(email.text).not.toContain('spam.example');
    expect(email.subject).not.toContain('spam.example');
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

  it('throws with Resend’s answer when the email is refused', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('domain not verified', { status: 403 }));

    await expect(sendEmail('re_test', notificationEmail(message), fetcher)).rejects.toThrow(
      'Resend answered 403: domain not verified',
    );
  });
});
