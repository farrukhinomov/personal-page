import { afterEach, describe, expect, it, vi } from 'vitest';
import { profile } from '@/data/profile';
import { ATTACHMENT_LIMITS } from './attachments';
import { SAMPLE_FILES } from './attachments.fixture';
import { handleMessage, type MessageServices } from './message-handler';
import type { Email } from './message-mail';
import { validBody } from './message.fixture';

const IP = '203.0.113.7';

function services(overrides: Partial<MessageServices> = {}) {
  return {
    verifyTurnstile: vi.fn<MessageServices['verifyTurnstile']>().mockResolvedValue(true),
    rateLimit: vi
      .fn<MessageServices['rateLimit']>()
      .mockResolvedValue({ allowed: true, remaining: 4 }),
    confirmationLimit: vi
      .fn<MessageServices['confirmationLimit']>()
      .mockResolvedValue({ allowed: true, remaining: 0 }),
    send: vi.fn<MessageServices['send']>().mockResolvedValue(undefined),
    count: vi.fn<MessageServices['count']>().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function errorOf(response: Response) {
  return ((await response.json()) as { error: { code: string; fields?: string[] } }).error;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('handleMessage', () => {
  it('delivers the Message to Farrukh and confirms it to the sender', async () => {
    const send = vi.fn<MessageServices['send']>().mockResolvedValue(undefined);
    const deps = services({ send });

    const response = await handleMessage(validBody, IP, deps);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(deps.verifyTurnstile).toHaveBeenCalledWith('token', IP);
    expect(deps.rateLimit).toHaveBeenCalledWith(IP);
    const recipients = send.mock.calls.map(([email]: [Email]) => email.to);
    expect(recipients).toEqual([profile.email, 'ada@example.com']);
  });

  it('attaches the files to the notification only', async () => {
    const send = vi.fn<MessageServices['send']>().mockResolvedValue(undefined);
    const files = [new File([SAMPLE_FILES.pdf], 'role.pdf')];

    const response = await handleMessage(validBody, IP, services({ send }), files);

    expect(response.status).toBe(200);
    const [notification, confirmation] = send.mock.calls.map(([email]: [Email]) => email);
    expect(notification?.attachments?.map((file) => file.filename)).toEqual(['role.pdf']);
    expect(confirmation?.attachments).toBeUndefined();
  });

  it('refuses too many or too large files before the bot check', async () => {
    const deps = services();
    const large = [new File([new Uint8Array(ATTACHMENT_LIMITS.totalBytes + 1)], 'a.pdf')];
    const many = Array.from(
      { length: ATTACHMENT_LIMITS.files + 1 },
      (_, index) => new File([SAMPLE_FILES.pdf], `${index}.pdf`),
    );

    const tooLarge = await handleMessage(validBody, IP, deps, large);
    const tooMany = await handleMessage(validBody, IP, deps, many);

    expect(tooLarge.status).toBe(413);
    expect((await errorOf(tooLarge)).code).toBe('payload_too_large');
    expect(tooMany.status).toBe(422);
    expect((await errorOf(tooMany)).code).toBe('invalid_attachment');
    expect(deps.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('reads file contents only after the bot check and the daily limit', async () => {
    const renamed = [new File(['MZ'], 'role.pdf')];
    const blocked = services({ verifyTurnstile: vi.fn().mockResolvedValue(false) });
    const deps = services();

    expect((await handleMessage(validBody, IP, blocked, renamed)).status).toBe(403);
    const response = await handleMessage(validBody, IP, deps, renamed);

    expect(response.status).toBe(422);
    expect((await errorOf(response)).code).toBe('invalid_attachment');
    expect(deps.rateLimit).toHaveBeenCalledOnce();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('answers a bot like a person but sends nothing', async () => {
    const deps = services();

    const response = await handleMessage({ ...validBody, website: 'x' }, IP, deps);

    expect(response.status).toBe(200);
    expect(deps.verifyTurnstile).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('names the invalid fields without checking anything else', async () => {
    const deps = services();

    const response = await handleMessage({ ...validBody, email: 'nope' }, IP, deps);

    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({ code: 'invalid_input', fields: ['email'] });
    expect(deps.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('refuses a failed bot check before counting against the limit', async () => {
    const deps = services({ verifyTurnstile: vi.fn().mockResolvedValue(false) });

    const response = await handleMessage(validBody, IP, deps);

    expect(response.status).toBe(403);
    expect((await errorOf(response)).code).toBe('verification_failed');
    expect(deps.rateLimit).not.toHaveBeenCalled();
  });

  it('refuses a sender over the daily limit', async () => {
    const deps = services({
      rateLimit: vi.fn().mockResolvedValue({ allowed: false, retryAfterSeconds: 600 }),
    });

    const response = await handleMessage(validBody, IP, deps);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('600');
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('reports a failed delivery and skips the confirmation', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = services({ send: vi.fn().mockRejectedValue(new Error('Resend down')) });

    const response = await handleMessage(validBody, IP, deps);

    expect(response.status).toBe(502);
    expect((await errorOf(response)).code).toBe('delivery_failed');
    expect(deps.send).toHaveBeenCalledOnce();
  });

  it('skips the confirmation once the recipient’s daily limit is used up', async () => {
    const send = vi.fn<MessageServices['send']>().mockResolvedValue(undefined);
    const confirmationLimit = vi.fn().mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await handleMessage(validBody, IP, services({ send, confirmationLimit }));

    expect(response.status).toBe(200);
    expect(confirmationLimit).toHaveBeenCalledWith('ada@example.com');
    expect(send.mock.calls.map(([email]: [Email]) => email.to)).toEqual([profile.email]);
    expect(warn).toHaveBeenCalledWith(
      'Confirmation skipped: the recipient’s daily limit is used up.',
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('ada@example.com');
  });

  it('still succeeds when only the confirmation fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const send = vi
      .fn<MessageServices['send']>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('bounced'));

    const response = await handleMessage(validBody, IP, services({ send }));

    expect(response.status).toBe(200);
    expect(error).toHaveBeenCalledOnce();
  });
});

describe('usage counts for the weekly summary', () => {
  it('counts a delivered Message and its confirmation', async () => {
    const deps = services();

    await handleMessage(validBody, IP, deps);

    expect(vi.mocked(deps.count).mock.calls).toEqual([['message:form'], ['confirmation:sent']]);
  });

  it('counts a Message that could not be delivered', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const deps = services({ send: vi.fn().mockRejectedValue(new Error('Resend down')) });

    await handleMessage(validBody, IP, deps);

    expect(vi.mocked(deps.count).mock.calls).toEqual([['message:failed']]);
  });

  it('counts a confirmation that could not be sent', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const send = vi
      .fn<MessageServices['send']>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Resend down'));
    const deps = services({ send });

    await handleMessage(validBody, IP, deps);

    expect(vi.mocked(deps.count).mock.calls).toEqual([['message:form'], ['confirmation:failed']]);
  });

  it('counts nothing for a bot or a refused request', async () => {
    const deps = services({ verifyTurnstile: vi.fn().mockResolvedValue(false) });

    await handleMessage({ ...validBody, website: 'x' }, IP, deps);
    await handleMessage(validBody, IP, deps);

    expect(deps.count).not.toHaveBeenCalled();
  });
});
