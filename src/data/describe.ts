import type { Locale } from '@/i18n/locales';
import { formatMonth } from './dates';
import type { ExperienceEntry, SkillItem } from './schema';

/** Date range of an Experience entry, e.g. "Juli 2022 – heute". */
export function describePeriod(
  entry: Pick<ExperienceEntry, 'start' | 'end'>,
  locale: Locale,
): string {
  const end = entry.end ? formatMonth(entry.end, locale) : locale === 'de' ? 'heute' : 'present';
  return `${formatMonth(entry.start, locale)} – ${end}`;
}

/** The text of a skill in one locale; plain technology names are the same in every locale. */
export function skillLabel(item: SkillItem, locale: Locale): string {
  return typeof item === 'string' ? item : item[locale];
}
