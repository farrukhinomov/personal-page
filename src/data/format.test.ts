import { describe, expect, it } from 'vitest';
import { formatDuration, formatMonth, yearsSince } from './dates';
import { describePeriod, skillLabel } from './describe';
import { buildTimeline } from './timeline';
import { experience } from './experience';

const OCT_2026 = new Date(2026, 9, 25);

describe('yearsSince', () => {
  it('counts only completed years', () => {
    expect(yearsSince('2019-09', OCT_2026)).toBe(7);
    expect(yearsSince('2019-11', OCT_2026)).toBe(6);
  });

  it('never returns a negative number', () => {
    expect(yearsSince('2030-01', OCT_2026)).toBe(0);
  });

  it('throws on a malformed month', () => {
    expect(() => yearsSince('soon', OCT_2026)).toThrow('Invalid month');
  });
});

describe('formatDuration', () => {
  it('shows years and months', () => {
    expect(formatDuration(28, 'en')).toBe('2y 4m');
  });

  it('drops a zero part', () => {
    expect(formatDuration(24, 'en')).toBe('2y');
    expect(formatDuration(5, 'en')).toBe('5m');
  });
});

describe('formatMonth and describePeriod', () => {
  it('formats in the requested locale', () => {
    expect(formatMonth('2022-07', 'de')).toBe('Juli 2022');
    expect(formatMonth('2022-07', 'en')).toBe('Jul 2022');
  });

  it('describes an open-ended period as current', () => {
    expect(describePeriod({ start: '2022-07', end: null }, 'de')).toBe('Juli 2022 – heute');
    expect(describePeriod({ start: '2019-09', end: '2021-08' }, 'en')).toBe('Sep 2019 – Aug 2021');
  });
});

describe('skillLabel', () => {
  it('returns technology names unchanged and translated text per locale', () => {
    expect(skillLabel('React', 'de')).toBe('React');
    expect(skillLabel({ de: 'Wissensaustausch', en: 'Knowledge sharing' }, 'en')).toBe(
      'Knowledge sharing',
    );
  });
});

describe('buildTimeline', () => {
  const timeline = buildTimeline(experience, OCT_2026);

  it('starts the earliest span at the beginning of the axis', () => {
    expect(Math.min(...timeline.spans.map((span) => span.offset))).toBe(0);
  });

  it('lets the current position run until now', () => {
    const current = timeline.spans.find((span) => span.entry.end === null);
    expect(current && current.offset + current.width).toBeCloseTo(100);
  });

  it('places one tick per year boundary inside the range', () => {
    expect(timeline.ticks.map((tick) => tick.year)).toEqual([
      2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
    ]);
  });

  it('returns an empty timeline for no entries', () => {
    expect(buildTimeline([], OCT_2026)).toEqual({ spans: [], ticks: [] });
  });
});
