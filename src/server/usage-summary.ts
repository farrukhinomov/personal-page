import { profile } from '@/data/profile';
import { MCP_TOOLS } from '@/mcp/discovery';
import { SENDER, type Email } from './message-mail';
import { errorResponse, okResponse } from './responses';
import { usageDay, type DayUsage, type UsageMetric } from './usage';

/** Vercel Web Analytics has no API on Hobby, so page views stay in the dashboard (issue #76). */
export const ANALYTICS_URL = 'https://vercel.com/farrukh-inomovs-projects/inomov-online/analytics';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;

export interface SummaryWeeks {
  /** The seven full days before `now`, oldest first. */
  current: string[];
  /** The seven days before those. */
  previous: string[];
}

export function summaryWeeks(now: Date): SummaryWeeks {
  const day = (back: number) => usageDay(new Date(now.getTime() - back * DAY_MS));
  const span = (from: number) => Array.from({ length: WEEK_DAYS }, (_, i) => day(from - i));
  return { current: span(WEEK_DAYS), previous: span(2 * WEEK_DAYS) };
}

export function totalUsage(days: readonly DayUsage[]): DayUsage {
  const total: DayUsage = {};
  for (const day of days) {
    for (const [metric, count] of Object.entries(day) as [UsageMetric, number][]) {
      total[metric] = (total[metric] ?? 0) + count;
    }
  }
  return total;
}

type Row = [label: string, metric: UsageMetric];

const SECTIONS: [title: string, rows: Row[]][] = [
  [
    'Nachrichten',
    [
      ['Kontaktformular', 'message:form'],
      ['KI-Assistenten', 'message:assistant'],
      ['Zustellung fehlgeschlagen', 'message:failed'],
    ],
  ],
  [
    'Intro Calls angefragt',
    [
      ['Kontaktformular', 'booking:form'],
      ['KI-Assistenten', 'booking:assistant'],
      ['Fehlgeschlagen', 'booking:failed'],
    ],
  ],
  [
    'Eingangsbestätigungen',
    [
      ['Gesendet', 'confirmation:sent'],
      ['Übersprungen (Tageslimit der Adresse)', 'limited:confirmation'],
      ['Fehlgeschlagen', 'confirmation:failed'],
    ],
  ],
  [
    'Abgewiesen wegen Tageslimit',
    [
      ['Nachrichten über das Formular, pro Adresse', 'limited:message'],
      ['Intro Calls, pro Adresse', 'limited:booking'],
      ['Nachrichten über Assistenten, pro Adresse', 'limited:mcpMessage'],
      ['Nachrichten über Assistenten, alle zusammen', 'limited:mcpMessageTotal'],
      ['Intro Calls über Assistenten, alle zusammen', 'limited:mcpBookingTotal'],
    ],
  ],
  ['MCP-Aufrufe je Tool', MCP_TOOLS.map((tool): Row => [tool, `mcp:${tool}`])],
];

const DATE = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const dateOf = (day: string) => DATE.format(new Date(`${day}T00:00:00Z`));

/** The summary in German, like the other emails Farrukh gets from the site. */
export function summaryEmail(weeks: SummaryWeeks, current: DayUsage, previous: DayUsage): Email {
  const range = `${dateOf(weeks.current[0] ?? '')} – ${dateOf(weeks.current.at(-1) ?? '')}`;
  const count = (usage: DayUsage, metric: UsageMetric) => usage[metric] ?? 0;
  const mcpTotal = (usage: DayUsage) =>
    MCP_TOOLS.reduce((sum, tool) => sum + count(usage, `mcp:${tool}`), 0);
  const messages = count(current, 'message:form') + count(current, 'message:assistant');
  const calls = count(current, 'booking:form') + count(current, 'booking:assistant');

  const sections = SECTIONS.map(([title, rows]) => [
    title,
    ...rows.map(
      ([label, metric]) => `  ${label}: ${count(current, metric)} (${count(previous, metric)})`,
    ),
    '',
  ]);

  return {
    from: SENDER,
    to: profile.email,
    replyTo: profile.email,
    subject: `Wochenübersicht inomov.online: ${messages} Nachrichten, ${calls} Intro Calls, ${mcpTotal(current)} MCP-Aufrufe`,
    text: [
      `Wochenübersicht ${range} (UTC), in Klammern die Woche davor.`,
      '',
      ...sections.flat(),
      `MCP-Aufrufe gesamt: ${mcpTotal(current)} (${mcpTotal(previous)}), ohne den täglichen Health Check.`,
      `Seitenaufrufe: ${ANALYTICS_URL}`,
    ].join('\n'),
  };
}

export interface SummaryServices {
  /** CRON_SECRET; Vercel sends it as a bearer token with every cron request. */
  secret: string | undefined;
  read(day: string): Promise<DayUsage>;
  send(email: Email): Promise<void>;
}

/** The weekly cron job: reads two weeks of counters and emails the summary. */
export async function handleWeeklySummary(
  request: Request,
  services: SummaryServices,
  now: Date = new Date(),
): Promise<Response> {
  if (!services.secret) {
    console.error('CRON_SECRET must be set for the weekly summary (see .env.example).');
    return errorResponse(500, 'not_configured', 'The summary is not configured.');
  }
  const authorization = request.headers.get('Authorization') ?? '';
  if (!(await sameText(authorization, `Bearer ${services.secret}`))) {
    return errorResponse(401, 'unauthorized', 'Not allowed.');
  }

  try {
    const weeks = summaryWeeks(now);
    const read = (days: string[]) => Promise.all(days.map((day) => services.read(day)));
    const [current, previous] = await Promise.all([read(weeks.current), read(weeks.previous)]);
    await services.send(summaryEmail(weeks, totalUsage(current), totalUsage(previous)));
  } catch (error) {
    console.error('Sending the weekly summary failed.', error);
    return errorResponse(502, 'summary_failed', 'The summary could not be sent.');
  }
  return okResponse();
}

/** Compares digests, so the time taken says nothing about how much of the secret matched. */
async function sameText(a: string, b: string): Promise<boolean> {
  const digest = async (text: string) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  return x.every((byte, i) => byte === y[i]);
}
