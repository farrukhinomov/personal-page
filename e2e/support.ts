import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

const SITEMAP = '.vercel/output/static/sitemap-0.xml';

/**
 * Every published page, read from the built sitemap, so new pages and posts are tested
 * without touching the tests. Paths, e.g. "/en/projects/kritis-grc".
 */
export function sitemapPaths(): string[] {
  let xml: string;
  try {
    xml = readFileSync(SITEMAP, 'utf8');
  } catch {
    throw new Error(`${SITEMAP} not found. Run "pnpm build" before the end-to-end tests.`);
  }
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, url]) => new URL(url ?? '').pathname,
  );
  if (paths.length === 0) throw new Error(`${SITEMAP} lists no pages.`);
  return paths;
}

export type Theme = 'light' | 'dark';

/** Stores the theme before any page script runs, as the theme toggle would. */
export async function useTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
}

/** The locale a path belongs to: English pages live under /en. */
export const localeOf = (path: string) => (path === '/en' || path.startsWith('/en/') ? 'en' : 'de');
