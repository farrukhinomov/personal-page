import { z } from 'astro/zod';

const text = z.string().trim().min(1);

/** Non-empty text in every locale. */
export const localized = z.object({ de: text, en: text });

/** Calendar month as `YYYY-MM`. */
export const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
  error: 'Expected a month as YYYY-MM',
});

export const profileSchema = z.object({
  name: text,
  headline: localized,
  summary: localized,
  location: localized,
  /** Machine-readable location for structured data and the JSON résumé. */
  address: z.object({ city: text, countryCode: z.string().regex(/^[A-Z]{2}$/) }),
  email: z.email(),
  /** Month Farrukh started working as a professional developer. */
  developerSince: yearMonth,
  links: z.object({
    github: z.url(),
    linkedin: z.url(),
  }),
  languages: z.array(z.object({ name: localized, level: localized })).min(1),
  awards: z.array(z.object({ title: localized, year: z.number().int() })),
});

export const experienceSchema = z
  .array(
    z
      .object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        kind: z.enum(['work', 'education']),
        organization: text,
        role: localized,
        location: localized,
        start: yearMonth,
        /** `null` while the position is current. */
        end: yearMonth.nullable(),
        summary: localized,
        highlights: z.array(localized),
        stack: z.array(text),
      })
      .refine((entry) => entry.end === null || entry.end >= entry.start, {
        error: 'An Experience entry cannot end before it starts',
      }),
  )
  .min(1);

export const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: text,
  /** GitHub repository as `owner/name`. */
  repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  /** Private repositories are shown without a source link ("source on request"). */
  visibility: z.enum(['public', 'private']),
  homepage: z.url().optional(),
  tagline: localized,
  description: localized,
  stack: z.array(text).min(1),
  year: z.number().int().min(2000),
  featured: z.boolean(),
});

export const projectsSchema = z
  .array(projectSchema)
  .min(1)
  .refine((projects) => new Set(projects.map((p) => p.slug)).size === projects.length, {
    error: 'Project slugs must be unique',
  });

export const availabilitySchema = z.object({
  openTo: z.array(z.enum(['permanent', 'freelance'])).min(1),
  /** ISO 3166-1 alpha-2 country codes where on-site work is possible. */
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1),
  remote: z.boolean(),
  /** Date the Availability was last confirmed, as `YYYY-MM-DD`. */
  updated: z.iso.date(),
});

export type Profile = z.infer<typeof profileSchema>;
export type ExperienceEntry = z.infer<typeof experienceSchema>[number];
export type Project = z.infer<typeof projectSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
