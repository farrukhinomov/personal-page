import { z } from 'astro/zod';

export const text = z.string().trim().min(1);

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

/** A titled list on a Project page, e.g. "Implemented" or "Current status". */
const projectSection = z.object({
  heading: localized,
  items: z.array(localized).min(1),
});

export const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: text,
  /** What kind of thing it is, shown after the name, e.g. "GRC-SaaS-Prototyp". */
  kind: localized.optional(),
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
  /** Optional detail sections; their content is updated by hand. */
  sections: z.array(projectSection).optional(),
  /** Date the sections were last checked against the project, as `YYYY-MM-DD`. */
  sectionsUpdated: z.iso.date().optional(),
  /** Self-hosted screen recording below `public/`, shown once the file exists. */
  demoVideo: z.object({ src: z.string().startsWith('/'), caption: localized }).optional(),
});

export const projectsSchema = z
  .array(projectSchema)
  .min(1)
  .refine((projects) => new Set(projects.map((p) => p.slug)).size === projects.length, {
    error: 'Project slugs must be unique',
  });

/** A skill is a technology name (not translated) or text that exists in every locale. */
const skillItem = z.union([text, localized]);

export const skillsSchema = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      name: localized,
      /** `tags` renders chips, `list` renders one line per item. */
      kind: z.enum(['tags', 'list']),
      items: z.array(skillItem).min(1),
    }),
  )
  .min(1)
  .refine((groups) => new Set(groups.map((group) => group.id)).size === groups.length, {
    error: 'Skill group ids must be unique',
  });

export type Profile = z.infer<typeof profileSchema>;
export type ExperienceEntry = z.infer<typeof experienceSchema>[number];
export type Project = z.infer<typeof projectSchema>;
export type SkillGroup = z.infer<typeof skillsSchema>[number];
export type SkillItem = SkillGroup['items'][number];
