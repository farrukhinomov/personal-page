import type { ExperienceEntry } from './schema';

export interface TimelineSpan {
  entry: ExperienceEntry;
  /** Distance from the timeline start, in percent of the whole range. */
  offset: number;
  /** Length of the span, in percent of the whole range. */
  width: number;
  /** Length of the span in whole months, counting both the first and last month. */
  months: number;
}

export interface Timeline {
  spans: TimelineSpan[];
  /** Year boundaries inside the range, with their position in percent. */
  ticks: { year: number; offset: number }[];
}

function monthIndex(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number);
  if (year === undefined || month === undefined) throw new Error(`Invalid month: ${yearMonth}`);
  return year * 12 + (month - 1);
}

function currentMonthIndex(now: Date): number {
  return now.getFullYear() * 12 + now.getMonth();
}

/**
 * Lays out Experience entries like spans in a trace waterfall:
 * every entry is placed on one shared time axis from the earliest start until `now`.
 */
export function buildTimeline(
  entries: readonly ExperienceEntry[],
  now: Date = new Date(),
): Timeline {
  if (entries.length === 0) return { spans: [], ticks: [] };

  const first = Math.min(...entries.map((entry) => monthIndex(entry.start)));
  const last = currentMonthIndex(now) + 1;
  const range = Math.max(1, last - first);
  const percent = (months: number) => (months / range) * 100;

  const spans = entries.map((entry) => {
    const start = monthIndex(entry.start);
    const end = entry.end ? monthIndex(entry.end) + 1 : last;
    const months = Math.max(1, end - start);
    return { entry, offset: percent(start - first), width: percent(months), months };
  });

  const ticks: Timeline['ticks'] = [];
  for (let year = Math.ceil(first / 12); year * 12 < last; year += 1) {
    ticks.push({ year, offset: percent(year * 12 - first) });
  }

  return { spans, ticks };
}
