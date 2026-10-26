import { describe, expect, it } from 'vitest';
import { buildOgEntries } from './og-catalog';
import { renderOgImage } from './og-render';
import { buildRobotsTxt } from './robots';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

describe('Open Graph images', () => {
  it('has one image per page, Project and Post in each locale, without duplicates', () => {
    const post = { slug: 'a-post', title: 'A post', description: 'About it.' };
    const entries = buildOgEntries({ de: [post], en: [post] });
    const paths = entries.map((entry) => [entry.locale, ...entry.segments].join('/'));
    expect(paths).toContain('de/home');
    expect(paths).toContain('en/projects/kritis-grc');
    expect(paths).toContain('en/blog/a-post');
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('renders a 1200×630 PNG', async () => {
    const png = await renderOgImage({ kicker: 'Blog', title: 'A title', subtitle: 'A subtitle' });
    expect([...png.slice(0, 4)]).toEqual(PNG_SIGNATURE);
    const view = new DataView(png.buffer, png.byteOffset);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630]);
  }, 20_000);
});

describe('robots.txt', () => {
  it('allows everything and points to the sitemap', () => {
    const robots = buildRobotsTxt();
    expect(robots.startsWith('User-agent: *\nAllow: /')).toBe(true);
    expect(robots).not.toContain('Disallow');
    expect(robots).toContain('Sitemap: https://inomov.online/sitemap-index.xml');
  });
});
