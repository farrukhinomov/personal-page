import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { profile } from '@/data/profile';
import type { Email } from '@/server/message-mail';
import {
  CALLER_IP,
  connectClient,
  ENDPOINT,
  fakeServices,
  portfolioHandler,
  SLOTS,
} from './mcp.fixture';

let client: Client | undefined;

afterEach(async () => {
  await client?.close();
  client = undefined;
  vi.restoreAllMocks();
});

async function connect(services: ReturnType<typeof fakeServices>) {
  client = await connectClient(portfolioHandler(services));
  return client;
}

const text = (result: { content: unknown }) => JSON.stringify(result.content);

const MESSAGE = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  topic: 'job',
  message: 'We would like to talk about a senior .NET role in our team.',
  lang: 'en',
};

const BOOKING = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  reason: 'A senior .NET role in our platform team.',
  start: SLOTS[0],
  timeZone: 'Europe/Berlin',
  lang: 'de',
};

describe('the write tools', () => {
  it('mark sending tools so hosts ask their user first', async () => {
    const { tools } = await (await connect(fakeServices())).listTools();
    const annotations = Object.fromEntries(tools.map((tool) => [tool.name, tool.annotations]));

    expect(annotations.get_available_slots).toMatchObject({
      readOnlyHint: true,
      openWorldHint: true,
    });
    for (const name of ['send_message', 'book_call']) {
      expect(annotations[name]).toMatchObject({ readOnlyHint: false, destructiveHint: false });
    }
  });
});

describe('get_available_slots', () => {
  it('lists the free times in the user’s time zone and language', async () => {
    const result = await (
      await connect(fakeServices())
    ).callTool({
      name: 'get_available_slots',
      arguments: { lang: 'en', timeZone: 'America/New_York' },
    });

    expect(result.structuredContent).toMatchObject({
      timeZone: 'America/New_York',
      windowDays: 30,
      slots: [{ start: SLOTS[0] }, { start: SLOTS[1] }],
    });
    const [first] = (result.structuredContent as { slots: { label: string }[] }).slots;
    expect(first?.label).toMatch(/Thu, Oct 29.*12:00\s?PM/);
  });

  it('uses Farrukh’s time zone when none is given', async () => {
    const result = await (
      await connect(fakeServices())
    ).callTool({
      name: 'get_available_slots',
      arguments: { lang: 'de' },
    });

    expect(result.structuredContent).toMatchObject({ timeZone: 'Europe/Berlin' });
    expect(text(result)).toContain('17:00');
  });

  it('points to the contact page when Cal.com cannot be reached', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const listSlots = vi.fn().mockRejectedValue(new Error('Cal.com down'));

    const result = await (
      await connect(fakeServices({ listSlots }))
    ).callTool({
      name: 'get_available_slots',
      arguments: { lang: 'en' },
    });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('https://inomov.online/en/contact');
  });
});

describe('send_message', () => {
  it('emails Farrukh, marked as coming from an assistant, without a confirmation', async () => {
    const services = fakeServices();

    const result = await (
      await connect(services)
    ).callTool({
      name: 'send_message',
      arguments: MESSAGE,
    });

    expect(result.structuredContent).toEqual({ status: 'sent' });
    expect(services.send).toHaveBeenCalledOnce();
    const [email] = vi.mocked(services.send).mock.calls[0] as [Email];
    expect(email).toMatchObject({ to: profile.email, replyTo: 'ada@example.com' });
    expect(email.subject).toBe(
      'Nachricht über einen KI-Assistenten: Stellenangebot von Ada Lovelace',
    );
    expect(email.text).toContain('Eingang: KI-Assistent (MCP)');
    expect(email.text).toContain(MESSAGE.message);
  });

  it('counts against the caller’s limit and the one for all assistants', async () => {
    const services = fakeServices();

    await (await connect(services)).callTool({ name: 'send_message', arguments: MESSAGE });

    expect(vi.mocked(services.rateLimit).mock.calls).toEqual([
      ['mcpMessage', CALLER_IP],
      ['mcpMessageTotal', 'all'],
    ]);
  });

  it.each(['auto', 'legacy'] as const)(
    'counts the caller by their own address with a %s client',
    async (mode) => {
      const services = fakeServices();
      client = await connectClient(portfolioHandler(services), mode);

      await client.callTool({ name: 'send_message', arguments: MESSAGE });

      expect(vi.mocked(services.rateLimit)).toHaveBeenCalledWith('mcpMessage', CALLER_IP);
    },
  );

  it('ignores an address a client claims for itself', async () => {
    const services = fakeServices();
    const handler = portfolioHandler(services);
    client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(ENDPOINT), {
        requestInit: { headers: { 'x-portfolio-client-ip': '198.51.100.1' } },
        fetch: (url, init) => handler.fetch(new Request(url, init), CALLER_IP),
      }),
    );

    await client.callTool({ name: 'send_message', arguments: MESSAGE });

    expect(vi.mocked(services.rateLimit)).toHaveBeenCalledWith('mcpMessage', CALLER_IP);
  });

  it('refuses to send when the caller’s address is unknown', async () => {
    const services = fakeServices();
    const handler = portfolioHandler(services);
    client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(ENDPOINT), {
        fetch: (url, init) => handler.fetch(new Request(url, init), ''),
      }),
    );

    const result = await client.callTool({ name: 'send_message', arguments: MESSAGE });

    expect(result.isError).toBe(true);
    expect(services.send).not.toHaveBeenCalled();
  });

  it.each([
    ['the caller', [false, true]],
    ['all assistants', [true, false]],
  ])('sends nothing once the daily limit of %s is used up', async (_, [own, total]) => {
    const rateLimit = vi
      .fn()
      .mockResolvedValueOnce(own ? { allowed: true } : { allowed: false })
      .mockResolvedValueOnce(total ? { allowed: true } : { allowed: false });
    const services = fakeServices({ rateLimit });

    const result = await (
      await connect(services)
    ).callTool({
      name: 'send_message',
      arguments: MESSAGE,
    });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain(profile.email);
    expect(services.send).not.toHaveBeenCalled();
  });

  it('refuses invalid details before counting or sending', async () => {
    const services = fakeServices();

    const result = await (
      await connect(services)
    ).callTool({
      name: 'send_message',
      arguments: { ...MESSAGE, email: 'not-an-email', message: 'Hi' },
    });

    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/email/);
    expect(services.rateLimit).not.toHaveBeenCalled();
    expect(services.send).not.toHaveBeenCalled();
  });

  it('answers with the fallback, not the internal error, when the limits cannot be checked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const rateLimit = vi.fn().mockRejectedValue(new Error('KV_REST_API_URL must be set'));
    const services = fakeServices({ rateLimit });

    const result = await (
      await connect(services)
    ).callTool({
      name: 'send_message',
      arguments: MESSAGE,
    });

    expect(result.isError).toBe(true);
    expect(text(result)).not.toContain('KV_REST_API_URL');
    expect(text(result)).toContain(profile.email);
    expect(services.send).not.toHaveBeenCalled();
  });

  it('says so when the email cannot be delivered', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const services = fakeServices({ send: vi.fn().mockRejectedValue(new Error('Resend down')) });

    const result = await (
      await connect(services)
    ).callTool({
      name: 'send_message',
      arguments: MESSAGE,
    });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('could not be sent');
  });
});

describe('book_call', () => {
  it('requests the call with Cal.com, noting that an assistant filled it in', async () => {
    const services = fakeServices();

    const result = await (
      await connect(services)
    ).callTool({
      name: 'book_call',
      arguments: { ...BOOKING, link: 'https://jobs.example.com/42' },
    });

    expect(result.structuredContent).toMatchObject({ status: 'requested', start: SLOTS[0] });
    expect((result.structuredContent as { label: string }).label).toContain('17:00');
    expect(services.book).toHaveBeenCalledWith({
      start: SLOTS[0],
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      timeZone: 'Europe/Berlin',
      language: 'de',
      company: 'Analytical Engines',
      reason:
        'A senior .NET role in our platform team.\n\nLink: https://jobs.example.com/42\n\nAngefragt über einen KI-Assistenten (MCP).',
    });
    expect(vi.mocked(services.rateLimit).mock.calls).toEqual([
      ['booking', CALLER_IP],
      ['mcpBookingTotal', 'all'],
    ]);
  });

  it('checks the Slot with Cal.com again, fresh, before booking it', async () => {
    const services = fakeServices({ slots: vi.fn().mockResolvedValue([SLOTS[1]]) });

    const result = await (
      await connect(services)
    ).callTool({
      name: 'book_call',
      arguments: BOOKING,
    });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('get_available_slots');
    expect(services.slots).toHaveBeenCalledOnce();
    expect(services.book).not.toHaveBeenCalled();
  });

  it('refuses a time that is not offered before it counts against a limit', async () => {
    const services = fakeServices();

    const result = await (
      await connect(services)
    ).callTool({
      name: 'book_call',
      arguments: { ...BOOKING, start: '2026-10-29T03:00:00.000Z' },
    });

    expect(result.isError).toBe(true);
    expect(services.rateLimit).not.toHaveBeenCalled();
    expect(services.book).not.toHaveBeenCalled();
  });

  it('books nothing once the daily limit is used up', async () => {
    const services = fakeServices({ rateLimit: vi.fn().mockResolvedValue({ allowed: false }) });

    const result = await (
      await connect(services)
    ).callTool({
      name: 'book_call',
      arguments: BOOKING,
    });

    expect(result.isError).toBe(true);
    expect(services.book).not.toHaveBeenCalled();
  });

  it('says so when Cal.com fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const services = fakeServices({ book: vi.fn().mockRejectedValue(new Error('Cal.com 500')) });

    const result = await (
      await connect(services)
    ).callTool({
      name: 'book_call',
      arguments: BOOKING,
    });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('https://inomov.online/kontakt');
  });
});

describe('usage counts for the weekly summary', () => {
  it('counts each tool call and a sent Message', async () => {
    const services = fakeServices();
    const assistant = await connect(services);

    await assistant.callTool({ name: 'get_profile', arguments: {} });
    await assistant.callTool({ name: 'send_message', arguments: MESSAGE });

    expect(vi.mocked(services.count).mock.calls).toEqual([
      ['mcp:get_profile'],
      ['message:assistant'],
      ['mcp:send_message'],
    ]);
  });

  it('counts a requested Intro Call', async () => {
    const services = fakeServices();

    await (await connect(services)).callTool({ name: 'book_call', arguments: BOOKING });

    expect(vi.mocked(services.count).mock.calls).toEqual([
      ['booking:assistant'],
      ['mcp:book_call'],
    ]);
  });

  it('counts a Message or call that failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const services = fakeServices({
      send: vi.fn().mockRejectedValue(new Error('Resend down')),
      book: vi.fn().mockRejectedValue(new Error('Cal.com down')),
    });
    const assistant = await connect(services);

    await assistant.callTool({ name: 'send_message', arguments: MESSAGE });
    await assistant.callTool({ name: 'book_call', arguments: BOOKING });

    expect(vi.mocked(services.count).mock.calls).toEqual([
      ['message:failed'],
      ['mcp:send_message'],
      ['booking:failed'],
      ['mcp:book_call'],
    ]);
  });

  it('does not count listing tools, unknown tools or the health check', async () => {
    const services = fakeServices();
    const handler = portfolioHandler(services);
    const call = (name: string, userAgent = 'test') =>
      handler.fetch(
        new Request(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
            'MCP-Protocol-Version': '2025-06-18',
            'User-Agent': userAgent,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: { name, arguments: {} },
          }),
        }),
        CALLER_IP,
      );

    await (await connect(services)).listTools();
    await call('drop_tables');
    await call('get_profile', 'inomov-health-check');

    expect(services.count).not.toHaveBeenCalled();
  });
});
