import { describe, expect, it } from 'vitest';
import { addDays, calendarWeeks, firstWeekWithSlots, groupByDay } from './booking-calendar';

const days = (...keys: string[]) => new Map(keys.map((key) => [key, ['slot']]));

describe('groupByDay', () => {
  it('groups Slots by day in time order', () => {
    const groups = groupByDay(
      ['2026-10-30T16:30:00Z', '2026-10-29T16:00:00Z', '2026-10-30T16:00:00Z'],
      (slot) => slot.slice(0, 10),
    );

    expect([...groups]).toEqual([
      ['2026-10-29', ['2026-10-29T16:00:00Z']],
      ['2026-10-30', ['2026-10-30T16:00:00Z', '2026-10-30T16:30:00Z']],
    ]);
  });
});

describe('addDays', () => {
  it('crosses month ends and the end of summer time', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-10-24', 7)).toBe('2026-10-31');
  });
});

describe('calendarWeeks', () => {
  it('pages Monday to Friday from the current week to the last day with a Slot', () => {
    // Wednesday, 28 October 2026.
    const weeks = calendarWeeks('2026-10-28', days('2026-10-29', '2026-11-03'));

    expect(weeks).toEqual([
      ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'],
      ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'],
    ]);
  });

  it('shows a weekend day only when it has Slots', () => {
    const [week] = calendarWeeks('2026-10-28', days('2026-10-31'));

    expect(week).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
    ]);
  });

  it('has no pages without Slots', () => {
    expect(calendarWeeks('2026-10-28', new Map())).toEqual([]);
  });
});

describe('firstWeekWithSlots', () => {
  it('skips weeks whose Slots are all taken', () => {
    const slots = days('2026-11-04');
    const weeks = calendarWeeks('2026-10-28', slots);

    expect(firstWeekWithSlots(weeks, slots)).toBe(1);
  });
});
