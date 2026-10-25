import type { Locale } from '@/i18n/locales';
import type { Availability, ExperienceEntry } from './schema';
import { formatMonth } from './dates';

const OPEN_TO_LABEL = {
  de: { permanent: 'Festanstellung', freelance: 'Freelance-Projekte' },
  en: { permanent: 'permanent roles', freelance: 'freelance projects' },
} as const satisfies Record<Locale, Record<Availability['openTo'][number], string>>;

/** One plain sentence describing Farrukh's Availability, e.g. for the hero. */
export function describeAvailability(availability: Availability, locale: Locale): string {
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  const regions = new Intl.DisplayNames(locale, { type: 'region' });

  const openTo = list.format(availability.openTo.map((kind) => OPEN_TO_LABEL[locale][kind]));
  const countries = list.format(availability.countries.map((code) => regions.of(code) ?? code));

  // A colon instead of "in …" avoids German articles ("in der Schweiz").
  if (locale === 'de') {
    const remote = availability.remote ? ' – oder remote' : '';
    return `Offen für ${openTo}. Vor Ort: ${countries}${remote}.`;
  }
  const remote = availability.remote ? ' – or remote' : '';
  return `Open to ${openTo}. On-site: ${countries}${remote}.`;
}

/** Date range of an Experience entry, e.g. "Juli 2022 – heute". */
export function describePeriod(
  entry: Pick<ExperienceEntry, 'start' | 'end'>,
  locale: Locale,
): string {
  const end = entry.end ? formatMonth(entry.end, locale) : locale === 'de' ? 'heute' : 'present';
  return `${formatMonth(entry.start, locale)} – ${end}`;
}
