import { describe, expect, it } from 'vitest';
import { buildLlmsFullTxt, buildLlmsTxt, type PostSummary } from './llms';
import { ogImagePath } from './og';
import { buildResume, resumePath } from './resume';
import {
  blogPostingSchema,
  graph,
  personSchema,
  profilePageSchema,
  serializeJsonLd,
  websiteSchema,
} from './structured-data';

const post: PostSummary = {
  title: 'A post',
  description: 'What the post is about.',
  path: '/en/blog/a-post',
  body: '## Heading\n\nBody text.',
};

describe('structured data', () => {
  it('describes the Person with links and without a phone number', () => {
    const person = personSchema('en');
    expect(person['@id']).toBe('https://inomov.online/#person');
    expect(person['sameAs']).toEqual([
      'https://github.com/farrukhinomov',
      'https://www.linkedin.com/in/inomov',
    ]);
    expect(JSON.stringify(person)).not.toMatch(/telephone|\+\d/);
  });

  it('adds the portrait to the Person as an absolute URL', () => {
    expect(personSchema('de')['image']).toBeUndefined();
    expect(personSchema('de', '/_astro/portrait.abc.jpg')['image']).toBe(
      'https://inomov.online/_astro/portrait.abc.jpg',
    );
  });

  it('links pages and articles to the Person and WebSite by @id', () => {
    const page = profilePageSchema('/en/about', 'en');
    expect(page['mainEntity']).toEqual({ '@id': 'https://inomov.online/#person' });
    expect(websiteSchema('de')['publisher']).toEqual({ '@id': 'https://inomov.online/#person' });

    const article = blogPostingSchema({
      path: '/blog/x',
      locale: 'de',
      title: 'T',
      description: 'D',
      published: new Date('2026-10-26T00:00:00Z'),
      updated: undefined,
      tags: ['Astro', '.NET'],
      imagePath: '/og/de/blog/x.png',
    });
    expect(article).toMatchObject({
      url: 'https://inomov.online/blog/x',
      inLanguage: 'de',
      dateModified: '2026-10-26T00:00:00.000Z',
      keywords: 'Astro, .NET',
      image: 'https://inomov.online/og/de/blog/x.png',
    });
  });

  it('serialises a graph that cannot break out of its script tag', () => {
    const json = serializeJsonLd(graph([{ '@type': 'Thing', name: '</script><script>' }]));
    expect(json).not.toContain('<');
    expect(JSON.parse(json)['@graph'][0].name).toBe('</script><script>');
  });
});

describe('ogImagePath', () => {
  it('builds an encoded path below /og/<locale>/', () => {
    expect(ogImagePath('en', 'projects', 'kritis-grc')).toBe('/og/en/projects/kritis-grc.png');
    expect(ogImagePath('de', 'a b')).toBe('/og/de/a%20b.png');
  });
});

describe('buildResume', () => {
  const resume = buildResume('en');

  it('follows JSON Resume v1 and keeps the current job open-ended', () => {
    expect(resume.$schema).toContain('jsonresume/resume-schema/v1.0.0');
    expect(resume.work[0]).toMatchObject({ name: 'INTEX EDV-Software GmbH', startDate: '2022-07' });
    expect(resume.work[0]).not.toHaveProperty('endDate');
  });

  it('only links public repositories', () => {
    const flowpro = resume.projects.find((project) => project.name === 'FlowPro');
    const kritis = resume.projects.find((project) => project.name === 'KRITIS GRC');
    expect(flowpro).not.toHaveProperty('repository');
    expect(kritis).toHaveProperty('repository', 'https://github.com/farrukhinomov/kritis-grc');
  });

  it('localises the content', () => {
    expect(buildResume('de').basics.label).toContain('Entwickler');
  });
});

describe('llms.txt', () => {
  it('starts with the name and a summary block, as the spec requires', () => {
    const [title, , summary] = buildLlmsTxt([post]).split('\n');
    expect(title).toBe('# Farrukh Inomov');
    expect(summary?.startsWith('> ')).toBe(true);
  });

  it('links pages in both languages, projects, posts and machine-readable files', () => {
    const text = buildLlmsTxt([post]);
    expect(text).toContain('(https://inomov.online/ueber-mich)');
    expect(text).toContain('(https://inomov.online/en/projects/kritis-grc)');
    expect(text).toContain('[A post](https://inomov.online/en/blog/a-post)');
    expect(text).toContain('(https://inomov.online/api/resume.json)');
  });

  it('says so when there are no posts', () => {
    expect(buildLlmsTxt([])).toContain('- No posts yet.');
    expect(buildLlmsFullTxt([])).toContain('No posts yet.');
  });

  it('includes full Experience, private-source notes and post bodies in llms-full.txt', () => {
    const text = buildLlmsFullTxt([post]);
    expect(text).toContain('## Experience');
    expect(text).toContain('Source: private, available on request');
    expect(text).toContain('Body text.');
  });
});

describe('review follow-ups', () => {
  it('omits keywords for a Post without tags', () => {
    const article = blogPostingSchema({
      path: '/blog/x',
      locale: 'en',
      title: 'T',
      description: 'D',
      published: new Date('2026-10-26T00:00:00Z'),
      updated: undefined,
      tags: [],
      imagePath: '/og/en/blog/x.png',
    });
    expect(article).not.toHaveProperty('keywords');
  });

  it('serves English as the canonical résumé and German alongside it', () => {
    expect(resumePath('en')).toBe('/api/resume.json');
    expect(resumePath('de')).toBe('/api/resume.de.json');
    expect(buildResume('de').meta.canonical).toBe('https://inomov.online/api/resume.de.json');
  });

  it('takes the location from the profile data', () => {
    expect(buildResume('en').basics.location).toEqual({ city: 'Saarbrücken', countryCode: 'DE' });
  });
});

describe('availability is not published', () => {
  it('appears in no machine-readable output', () => {
    const everything = JSON.stringify([
      personSchema('en'),
      personSchema('de'),
      buildResume('en'),
      buildResume('de'),
      buildLlmsTxt([]),
      buildLlmsFullTxt([]),
    ]);
    // "available on request" (private source code) is fine; work availability is not.
    expect(everything).not.toMatch(
      /availability|open to|offen für|festanstellung|seeks|freelance/i,
    );
  });

  it('publishes the full skill list in the résumé, JSON-LD and llms-full.txt', () => {
    expect(buildResume('en').skills.map((group) => group.name)).toContain('Ways of working');
    expect(personSchema('en')['knowsAbout']).toContain('FastAPI');
    expect(buildLlmsFullTxt([])).toContain('## Skills');
    expect(buildLlmsFullTxt([])).toContain('Ant Design');
  });
});
