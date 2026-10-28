import { describe, expect, it } from 'vitest';
import { HONEYPOT_FIELD, parseMessage, TOPIC_LABELS, TOPICS } from './message';
import { validBody } from './message.fixture';

describe('parseMessage', () => {
  it('accepts a complete Message and trims the text', () => {
    const parsed = parseMessage({ ...validBody, name: '  Ada Lovelace  ' });

    expect(parsed).toEqual({ kind: 'message', message: { ...validBody, topic: 'job' } });
  });

  it('treats the company as optional', () => {
    const withoutCompany: Partial<typeof validBody> = { ...validBody };
    delete withoutCompany.company;

    expect(parseMessage(withoutCompany)).toMatchObject({
      kind: 'message',
      message: { company: '' },
    });
  });

  it('marks a filled honeypot as a bot before anything else', () => {
    expect(parseMessage({ [HONEYPOT_FIELD]: 'https://spam.example' })).toEqual({ kind: 'bot' });
  });

  it('ignores an empty honeypot', () => {
    expect(parseMessage({ ...validBody, [HONEYPOT_FIELD]: '' }).kind).toBe('message');
  });

  it.each([
    ['name', { name: 'A' }],
    ['name', { name: 'Ada\r\nBcc: victim@example.com' }],
    ['email', { email: 'not-an-email' }],
    ['company', { company: 'x'.repeat(101) }],
    ['topic', { topic: 'sales' }],
    ['message', { message: 'Too short' }],
    ['message', { message: 'x'.repeat(5001) }],
    ['consent', { consent: false }],
    ['locale', { locale: 'fr' }],
    ['turnstileToken', { turnstileToken: '' }],
  ])('rejects an invalid %s', (field, change) => {
    expect(parseMessage({ ...validBody, ...change })).toEqual({ kind: 'invalid', fields: [field] });
  });

  it('lists every invalid field once', () => {
    const parsed = parseMessage({ ...validBody, name: '', email: '', consent: 'yes' });

    expect(parsed).toEqual({ kind: 'invalid', fields: ['name', 'email', 'consent'] });
  });

  it('rejects a body that is not an object', () => {
    expect(parseMessage('hello')).toEqual({ kind: 'invalid', fields: ['body'] });
  });
});

describe('TOPIC_LABELS', () => {
  it('labels every topic in both locales', () => {
    for (const topic of TOPICS) {
      expect(TOPIC_LABELS[topic].de).not.toBe('');
      expect(TOPIC_LABELS[topic].en).not.toBe('');
    }
  });
});
