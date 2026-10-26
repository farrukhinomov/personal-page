import { describe, expect, it } from 'vitest';
import { experience } from './experience';
import { profile } from './profile';
import { projects } from './projects';
import { skills } from './skills';
import { skillLabel } from './describe';
import { experienceSchema, profileSchema, projectsSchema, skillsSchema } from './schema';

describe('portfolio data', () => {
  it('lists Experience newest first', () => {
    const starts = experience.map((entry) => entry.start);
    expect(starts).toEqual([...starts].sort().reverse());
  });

  it('has exactly one current position', () => {
    expect(experience.filter((entry) => entry.end === null)).toHaveLength(1);
  });

  it('never publishes a phone number', () => {
    const serialized = JSON.stringify({ profile, experience, projects, skills });
    // An international prefix, or ten or more digits in a row (dates are only 4 at most).
    expect(serialized).not.toMatch(/\+\d|\d{10,}/);
  });

  it('shows KRITIS GRC first, then the inomov.online project, each with its live link', () => {
    expect(projects.map((project) => project.slug).slice(0, 2)).toEqual([
      'kritis-grc',
      'inomov-online',
    ]);
    expect(projects[0]?.homepage).toBe('https://grc.inomov.online');
    expect(projects[1]).toMatchObject({
      repository: 'farrukhinomov/personal-page',
      visibility: 'public',
      homepage: 'https://inomov.online',
    });
  });

  it('says the KRITIS demo is a prototype on demo data, in both languages', () => {
    const kritis = projects[0];
    expect(kritis?.description.en).toContain('prototype on fictional demo data');
    expect(kritis?.description.de).toContain('Prototyp mit fiktiven Demodaten');
  });

  it('marks private repositories so they get no source link', () => {
    expect(projects.find((project) => project.slug === 'flowpro')?.visibility).toBe('private');
  });
});

describe('skills', () => {
  const labels = (locale: 'de' | 'en') =>
    skills.flatMap((group) => group.items.map((item) => skillLabel(item, locale)));

  it('lists every skill the owner asked for', () => {
    const wanted = [
      'Python',
      'Django',
      'FastAPI',
      'React',
      'ES6',
      'TypeScript',
      'JavaScript',
      'Ant Design',
      'REST APIs',
      'PostgreSQL',
      'ORM',
      'AI First Development',
      'AI-assisted Code Review & Coding Tools',
      'Knowledge sharing',
    ];
    for (const skill of wanted) expect(labels('en')).toContain(skill);
    expect(labels('en').some((label) => label.startsWith('Django REST Framework'))).toBe(true);
    expect(labels('en').some((label) => label.includes('Product Management and UX'))).toBe(true);
  });

  it('translates ways of working and keeps technology names unchanged', () => {
    expect(labels('de')).toContain('Wissensaustausch');
    expect(labels('de')).toContain('PostgreSQL');
    expect(labels('de')).not.toContain('Knowledge sharing');
  });

  it('has no duplicate skills', () => {
    expect(new Set(labels('en')).size).toBe(labels('en').length);
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

  it('rejects duplicate skill group ids', () => {
    const group = { id: 'a', name: { de: 'A', en: 'A' }, kind: 'tags', items: ['x'] };
    expect(skillsSchema.safeParse([group, group]).success).toBe(false);
  });
});
