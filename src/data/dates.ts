import type { Locale } from '@/i18n/locales';

/** Whole years between a `YYYY-MM` month and `now`. */
export function yearsSince(yearMonth: string, now: Date = new Date()): number {
  const [year, month] = yearMonth.split('-').map(Number);
  if (year === undefined || month === undefined || Number.isNaN(year) || Number.isNaN(month)) {
    throw new Error(`Invalid month: ${yearMonth}`);
  }
  const months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  return Math.max(0, Math.floor(months / 12));
}

/** A length of time in months as short text, e.g. "4 J. 4 M." or "4y 4m". */
export function formatDuration(totalMonths: number, locale: Locale): string {
  const unit = (value: number, name: 'year' | 'month') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'narrow' }).format(
      value,
    );
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [years > 0 ? unit(years, 'year') : null, months > 0 ? unit(months, 'month') : null];
  return parts.filter(Boolean).join(' ') || unit(0, 'month');
}

/** Formats a calendar date for display, e.g. "26. Oktober 2026" or "October 26, 2026". */
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

/** Formats a `YYYY-MM` month for display, e.g. "Juli 2022" or "Jul 2022". */
export function formatMonth(yearMonth: string, locale: Locale): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (year === undefined || month === undefined) throw new Error(`Invalid month: ${yearMonth}`);
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
