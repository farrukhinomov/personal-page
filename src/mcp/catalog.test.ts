import { describe, expect, it } from 'vitest';
import { experience } from '@/data/experience';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import {
  experienceView,
  postListView,
  postView,
  profileView,
  projectListView,
  projectView,
  skillsView,
} from './catalog';
import { POSTS } from './catalog.fixture';

describe('profileView', () => {
  it('answers in the requested language with absolute links', () => {
    const de = profileView('de');
    const en = profileView('en');

    expect(de.headline).toBe(profile.headline.de);
    expect(en.location).toBe('Saarbrücken, Germany');
    expect(en.links).toMatchObject({
      website: 'https://inomov.online/en',
      contact: 'https://inomov.online/en/contact',
      cv: 'https://inomov.online/cv/farrukh-inomov-cv.pdf',
    });
    expect(de.links.cv).toBe('https://inomov.online/cv/farrukh-inomov-lebenslauf.pdf');
  });

  it('shares only what the site shows: no phone number, no street', () => {
    const text = JSON.stringify([profileView('de'), profileView('en')]);

    expect(text).not.toMatch(/\+\d|\d{10,}/);
    expect(text).not.toContain('Waldstraße');
  });
});

describe('experienceView', () => {
  it('lists every entry, or only work or education', () => {
    const work = experience.filter((entry) => entry.kind === 'work').length;

    expect(experienceView('en').entries).toHaveLength(experience.length);
    expect(experienceView('en', 'work').entries).toHaveLength(work);
    expect(experienceView('en', 'education').entries.every((e) => e.kind === 'education')).toBe(
      true,
    );
  });

  it('describes the period like the site does', () => {
    const current = experienceView('de').entries.find((entry) => entry.end === null);

    expect(current?.period).toMatch(/– heute$/);
  });
});

describe('skillsView', () => {
  it('translates group names and keeps technology names', () => {
    const [first] = skillsView('de').groups;

    expect(first?.name).toBe('Berufserfahrung');
    expect(first?.skills).toContain('C#');
  });
});

describe('projects', () => {
  it('lists every project with its page link', () => {
    const listed = projectListView('en').projects;

    expect(listed.map((project) => project.slug)).toEqual(projects.map((p) => p.slug));
    expect(listed[0]?.links.page).toBe(`https://inomov.online/en/projects/${projects[0]?.slug}`);
  });

  it('links a repository only when its source is public', () => {
    for (const project of projectListView('en').projects) {
      expect(Boolean(project.links.repository)).toBe(project.sourceAvailable);
    }
  });

  it('returns one project with its sections, and nothing for an unknown slug', () => {
    const grc = projectView('kritis-grc', 'de');

    expect(grc?.description).toContain('KRITIS');
    expect(grc?.sections[0]?.heading).toBe('Umgesetzt');
    expect(projectView('unknown', 'de')).toBeUndefined();
  });
});

describe('posts', () => {
  it('lists Posts with dates as days and links in the language', () => {
    expect(postListView(POSTS, 'de').posts).toEqual([
      {
        slug: 'react-quality-gates',
        title: 'Quality gates for React',
        description: 'How the pipeline keeps a React app honest.',
        published: '2026-10-01',
        updated: '2026-10-12',
        tags: ['react', 'ci'],
        readingMinutes: 6,
        url: 'https://inomov.online/blog/react-quality-gates',
      },
    ]);
  });

  it('returns one Post with its Markdown, and nothing for an unknown slug', () => {
    expect(postView(POSTS, 'react-quality-gates', 'en')?.markdown).toBe('## Why\n\nBecause.');
    expect(postView(POSTS, 'unknown', 'en')).toBeUndefined();
  });
});
