import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Email } from './message-mail';
import {
  ANALYTICS_URL,
  handleWeeklySummary,
  summaryEmail,
  summaryWeeks,
  totalUsage,
  type SummaryServices,
} from './usage-summary';

/** Monday 2 November 2026, when the cron job runs. */
const MONDAY = new Date('2026-11-02T07:00:00Z');
const SECRET = 'cron-secret';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('summaryWeeks', () => {
  it('takes the seven days before the run and the seven before those', () => {
    expect(summaryWeeks(MONDAY)).toEqual({
      current: [
        '2026-10-26',
        '2026-10-27',
        '2026-10-28',
        '2026-10-29',
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
      ],
      previous: [
        '2026-10-19',
        '2026-10-20',
        '2026-10-21',
        '2026-10-22',
        '2026-10-23',
        '2026-10-24',
        '2026-10-25',
      ],
    });
  });
});

describe('totalUsage', () => {
  it('adds up the days metric by metric', () => {
    expect(
      totalUsage([{ 'message:form': 1, 'mcp:get_profile': 3 }, {}, { 'message:form': 2 }]),
    ).toEqual({ 'message:form': 3, 'mcp:get_profile': 3 });
  });
});

describe('summaryEmail', () => {
  const email = summaryEmail(
    summaryWeeks(MONDAY),
    {
      'message:form': 2,
      'message:assistant': 1,
      'booking:assistant': 1,
      'limited:confirmation': 1,
      'mcp:get_profile': 5,
      'mcp:send_message': 1,
    },
    { 'message:form': 1, 'mcp:get_profile': 2 },
  );
  const lines = email.text.split('\n');

  it('goes to Farrukh from the site, with the totals in the subject', () => {
    expect(email).toMatchObject({
      from: 'Farrukh Inomov <contact@inomov.online>',
      to: 'farrukh@inomov.online',
      subject: 'Wochenübersicht inomov.online: 3 Nachrichten, 1 Intro Calls, 6 MCP-Aufrufe',
    });
  });

  it('names the week and compares every count with the week before', () => {
    expect(lines[0]).toBe(
      'Wochenübersicht 26.10.2026 – 01.11.2026 (UTC), in Klammern die Woche davor.',
    );
    expect(lines).toContain('  Kontaktformular: 2 (1)');
    expect(lines).toContain('  Übersprungen (Tageslimit der Adresse): 1 (0)');
    expect(lines).toContain('  get_profile: 5 (2)');
    expect(lines).toContain('  book_call: 0 (0)');
  });

  it('ends with the MCP total and the link to the page views', () => {
    expect(lines.slice(-2)).toEqual([
      'MCP-Aufrufe gesamt: 6 (2), ohne den täglichen Health Check.',
      `Seitenaufrufe: ${ANALYTICS_URL}`,
    ]);
  });
});

describe('handleWeeklySummary', () => {
  function services(overrides: Partial<SummaryServices> = {}) {
    return {
      secret: SECRET,
      read: vi.fn<SummaryServices['read']>().mockResolvedValue({ 'message:form': 1 }),
      send: vi.fn<SummaryServices['send']>().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  const cron = (authorization?: string) =>
    new Request('https://inomov.online/api/cron/weekly-summary', {
      headers: authorization ? { Authorization: authorization } : {},
    });

  it('reads two weeks of counters and sends the summary', async () => {
    const deps = services();

    const response = await handleWeeklySummary(cron(`Bearer ${SECRET}`), deps, MONDAY);

    expect(await response.json()).toEqual({ ok: true });
    expect(deps.read).toHaveBeenCalledTimes(14);
    expect(deps.read).toHaveBeenCalledWith('2026-10-19');
    expect(deps.read).toHaveBeenCalledWith('2026-11-01');
    const sent = vi.mocked(deps.send).mock.calls[0]?.[0] as Email;
    expect(sent.text).toContain('  Kontaktformular: 7 (7)');
  });

  it.each([
    ['no token', undefined],
    ['a wrong token', 'Bearer guess'],
    ['the secret without the scheme', SECRET],
  ])('refuses a request with %s', async (_, authorization) => {
    const deps = services();

    const response = await handleWeeklySummary(cron(authorization), deps, MONDAY);

    expect(response.status).toBe(401);
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('fails loudly while CRON_SECRET is not set', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const deps = services({ secret: undefined });

    const response = await handleWeeklySummary(cron('Bearer '), deps, MONDAY);

    expect(response.status).toBe(500);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('CRON_SECRET must be set'));
    expect(deps.read).not.toHaveBeenCalled();
  });

  it('answers 502 when the summary cannot be sent', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const deps = services({ send: vi.fn().mockRejectedValue(new Error('Resend down')) });

    const response = await handleWeeklySummary(cron(`Bearer ${SECRET}`), deps, MONDAY);

    expect(response.status).toBe(502);
  });
});
