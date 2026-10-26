import { localized, text } from './schema';
import { z } from 'astro/zod';

/**
 * Postal address for the Impressum (DDG § 5). Kept apart from `profile` on purpose:
 * it appears on the Impressum page and in the CV sent with applications (never published),
 * never in structured data, the JSON résumé or the CV on the site.
 */
const legalSchema = z.object({
  street: text,
  postalCode: z.string().regex(/^\d{5}$/),
  city: text,
  country: localized,
});

export const legal = legalSchema.parse({
  street: 'Waldstraße 6',
  postalCode: '66113',
  city: 'Saarbrücken',
  country: { de: 'Deutschland', en: 'Germany' },
});
