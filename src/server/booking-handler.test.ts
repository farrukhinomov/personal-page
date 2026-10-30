import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookingWindow, handleBooking, handleSlots, type BookingServices } from './booking-handler';

const IP = '203.0.113.7';
const SLOT = '2026-10-29T16:00:00.000Z';

const validBody = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  reason: 'A senior .NET role in our platform team.',
  start: '2026-10-29T17:00:00.000+01:00',
  timeZone: 'Europe/Berlin',
  consent: true,
  locale: 'de',
  turnstileToken: 'token',
};

function services(overrides: Partial<BookingServices> = {}) {
  return {
    verifyTurnstile: vi.fn<BookingServices['verifyTurnstile']>().mockResolvedValue(true),
    rateLimit: vi
      .fn<BookingServices['rateLimit']>()
      .mockResolvedValue({ allowed: true, remaining: 2 }),
    slots: vi.fn<BookingServices['slots']>().mockResolvedValue([SLOT]),
    book: vi.fn<BookingServices['book']>().mockResolvedValue({ kind: 'requested', uid: 'abc' }),
    count: vi.fn<BookingServices['count']>().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function errorOf(response: Response) {
  return ((await response.json()) as { error: { code: string; fields?: string[] } }).error;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('bookingWindow', () => {
  it('spans the next 30 days', () => {
    const now = new Date('2026-10-28T12:00:00Z');

    expect(bookingWindow(now)).toEqual({ from: now, to: new Date('2026-11-27T12:00:00Z') });
  });
});

describe('handleSlots', () => {
  it('returns the free Slots with a short CDN cache', async () => {
    const response = await handleSlots(
      new URL('https://inomov.online/api/slots'),
      async () => [SLOT],
      new Date('2026-10-28T12:00:00Z'),
    );

    expect(await response.json()).toEqual({ ok: true, slots: [SLOT] });
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=60');
  });

  it('answers 502 when Cal.com is unreachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await handleSlots(new URL('https://inomov.online/api/slots'), () =>
      Promise.reject(new Error('down')),
    );

    expect(response.status).toBe(502);
    expect((await errorOf(response)).code).toBe('slots_unavailable');
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=10');
  });

  it('refuses a query string, which would bypass the CDN cache, without asking Cal.com', async () => {
    const slots = vi.fn<BookingServices['slots']>();

    const response = await handleSlots(new URL('https://inomov.online/api/slots?x=1'), slots);

    expect(response.status).toBe(400);
    expect(slots).not.toHaveBeenCalled();
  });
});

describe('handleBooking', () => {
  it('re-checks the Slot and books it for the Visitor', async () => {
    const book = vi
      .fn<BookingServices['book']>()
      .mockResolvedValue({ kind: 'requested', uid: 'abc' });
    const deps = services({ book });

    const response = await handleBooking(validBody, IP, deps);

    expect(response.status).toBe(200);
    expect(deps.rateLimit).toHaveBeenCalledWith(IP);
    expect(deps.slots).toHaveBeenCalledWith({
      from: new Date(SLOT),
      to: new Date('2026-10-30T16:00:00.000Z'),
    });
    expect(book).toHaveBeenCalledWith({
      start: SLOT,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      timeZone: 'Europe/Berlin',
      language: 'de',
      company: 'Analytical Engines',
      reason: 'A senior .NET role in our platform team.',
    });
  });

  it('adds an optional link, e.g. to a job posting, below the reason', async () => {
    const book = vi
      .fn<BookingServices['book']>()
      .mockResolvedValue({ kind: 'requested', uid: 'x' });
    const link = 'https://jobs.example.com/senior-dotnet';

    await handleBooking({ ...validBody, link }, IP, services({ book }));

    expect(book.mock.calls[0]?.[0].reason).toBe(
      `A senior .NET role in our platform team.\n\nLink: ${link}`,
    );
  });

  it('answers a bot like a person but books nothing', async () => {
    const deps = services();

    expect((await handleBooking({ ...validBody, website: 'x' }, IP, deps)).status).toBe(200);
    expect(deps.book).not.toHaveBeenCalled();
  });

  it.each([
    ['company', { company: '' }],
    ['reason', { reason: 'Hi' }],
    ['link', { link: 'javascript:alert(1)' }],
    ['link', { link: 'not a link' }],
    ['link', { link: 'https://a.example/x\n\nLink: https://evil.example' }],
    ['link', { link: 'https://a.example/ x' }],
    ['start', { start: 'tomorrow at five' }],
    ['timeZone', { timeZone: 'Mars/Olympus' }],
    ['consent', { consent: false }],
  ])('rejects an invalid %s', async (field, change) => {
    const response = await handleBooking({ ...validBody, ...change }, IP, services());

    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({ code: 'invalid_input', fields: [field] });
  });

  it('refuses a failed bot check before counting against the limit', async () => {
    const deps = services({ verifyTurnstile: vi.fn().mockResolvedValue(false) });

    expect((await handleBooking(validBody, IP, deps)).status).toBe(403);
    expect(deps.rateLimit).not.toHaveBeenCalled();
  });

  it('refuses a sender over the daily limit', async () => {
    const deps = services({
      rateLimit: vi.fn().mockResolvedValue({ allowed: false, retryAfterSeconds: 60 }),
    });

    expect((await handleBooking(validBody, IP, deps)).status).toBe(429);
    expect(deps.book).not.toHaveBeenCalled();
  });

  it('never books a time Cal.com does not offer', async () => {
    const deps = services({ slots: vi.fn().mockResolvedValue(['2026-10-29T16:30:00.000Z']) });

    const response = await handleBooking(validBody, IP, deps);

    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe('slot_unavailable');
    expect(deps.book).not.toHaveBeenCalled();
  });

  it('reports a Slot Cal.com refuses as taken', async () => {
    const deps = services({ book: vi.fn().mockResolvedValue({ kind: 'refused', status: 400 }) });

    expect((await handleBooking(validBody, IP, deps)).status).toBe(409);
  });

  it('answers 502 when Cal.com fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = services({ book: vi.fn().mockRejectedValue(new Error('down')) });

    const response = await handleBooking(validBody, IP, deps);

    expect(response.status).toBe(502);
    expect((await errorOf(response)).code).toBe('booking_failed');
  });
});

describe('usage counts for the weekly summary', () => {
  it('counts a requested Intro Call', async () => {
    const deps = services();

    await handleBooking(validBody, IP, deps);

    expect(vi.mocked(deps.count).mock.calls).toEqual([['booking:form']]);
  });

  it('counts a booking Cal.com could not take', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const deps = services({ book: vi.fn().mockRejectedValue(new Error('Cal.com down')) });

    await handleBooking(validBody, IP, deps);

    expect(vi.mocked(deps.count).mock.calls).toEqual([['booking:failed']]);
  });

  it('counts nothing when the time is no longer free', async () => {
    const deps = services({ slots: vi.fn().mockResolvedValue([]) });

    await handleBooking(validBody, IP, deps);

    expect(deps.count).not.toHaveBeenCalled();
  });
});
