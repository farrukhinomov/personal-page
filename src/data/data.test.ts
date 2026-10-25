import { describe, expect, it } from 'vitest';
import { availability } from './availability';
import { experience } from './experience';
import { profile } from './profile';
import { projects } from './projects';
import { experienceSchema, profileSchema, projectsSchema } from './schema';

describe('portfolio data', () => {
  it('lists Experience newest first', () => {
    const starts = experience.map((entry) => entry.start);
    expect(starts).toEqual([...starts].sort().reverse());
  });

  it('has exactly one current position', () => {
    expect(experience.filter((entry) => entry.end === null)).toHaveLength(1);
  });

  it('never publishes a phone number', () => {
    const serialized = JSON.stringify({ profile, experience, projects, availability });
    // An international prefix, or ten or more digits in a row (dates are only 4 at most).
    expect(serialized).not.toMatch(/\+\d|\d{10,}/);
  });

  it('marks private repositories so they get no source link', () => {
    expect(projects.find((project) => project.slug === 'flowpro')?.visibility).toBe('private');
  });
});

describe('schemas', () => {
  it('rejects text that is missing in one locale', () => {
    const result = profileSchema.safeParse({ ...profile, headline: { de: 'Entwickler', en: '' } });
    expect(result.success).toBe(false);
  });

  it('rejects an Experience entry that ends before it starts', () => {
    const [first] = experience;
    const result = experienceSchema.safeParse([{ ...first, start: '2022-07', end: '2021-01' }]);
    expect(result.success).toBe(false);
  });

  it('rejects duplicate Project slugs', () => {
    const [first] = projects;
    expect(projectsSchema.safeParse([first, first]).success).toBe(false);
  });
});
