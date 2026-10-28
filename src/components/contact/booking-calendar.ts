/**
 * Calendar logic of the Intro Call picker, kept free of the DOM so it can be tested: Slots
 * grouped by the Visitor's day, and the booking window split into week pages. Days are
 * `YYYY-MM-DD` keys in the Visitor's time zone.
 */

const DAY_MS = 86_400_000;
const WORKDAYS = 5;

/** Slot starts grouped by the Visitor's calendar day, in time order. */
export function groupByDay(
  slots: readonly string[],
  dayOf: (slot: string) => string,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const slot of [...slots].sort()) {
    const day = dayOf(slot);
    groups.set(day, [...(groups.get(day) ?? []), slot]);
  }
  return groups;
}

/**
 * Week pages, Monday first, from the week of `today` to the week of the last day with a Slot.
 * Each page shows Monday to Friday; a weekend day only appears when it has Slots, which happens
 * for Visitors far east of Berlin.
 */
export function calendarWeeks(today: string, slotsByDay: ReadonlyMap<string, unknown>): string[][] {
  const last = [...slotsByDay.keys()].sort().at(-1);
  if (!last) return [];
  const weeks: string[][] = [];
  for (let monday = mondayOf(today); monday <= last; monday = addDays(monday, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, index) => addDays(monday, index)).filter(
        (day, index) => index < WORKDAYS || slotsByDay.has(day),
      ),
    );
  }
  return weeks;
}

/** The first week page with a Slot, or the first page. */
export function firstWeekWithSlots(
  weeks: readonly string[][],
  slotsByDay: ReadonlyMap<string, unknown>,
): number {
  return Math.max(
    0,
    weeks.findIndex((week) => week.some((day) => slotsByDay.has(day))),
  );
}

/** Midnight UTC of a day key, for formatting it with `timeZone: 'UTC'`. */
export function dateOf(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

export function addDays(day: string, count: number): string {
  return new Date(dateOf(day).getTime() + count * DAY_MS).toISOString().slice(0, 10);
}

function mondayOf(day: string): string {
  const sinceMonday = (dateOf(day).getUTCDay() + 6) % 7;
  return addDays(day, -sinceMonday);
}
