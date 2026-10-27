import { expect, test } from '@playwright/test';
import { useTheme, type Theme } from './support';

/**
 * Screenshots of the three page layouts at phone, tablet and desktop width in both themes.
 * Linux only (see playwright.config.ts); update them with `pnpm test:visual --update-snapshots`.
 */

const PAGES = { home: '/', project: '/projekte/kritis-grc', about: '/ueber-mich' };
const WIDTHS = [375, 768, 1440];
const THEMES: Theme[] = ['light', 'dark'];

// Final state, no motion: screenshots must not depend on animation timing.
test.use({ reducedMotion: 'reduce' });

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test.describe(`${theme} at ${width}px`, () => {
      test.use({ viewport: { width, height: 900 } });

      test.beforeEach(async ({ page }) => {
        await useTheme(page, theme);
      });

      for (const [name, path] of Object.entries(PAGES)) {
        test(name, async ({ page }) => {
          await page.goto(path);
          await page.evaluate(() => document.fonts.ready);
          // Lazy images below the fold only load once scrolled to; the other theme's are hidden.
          for (const image of await page.locator('img[loading="lazy"]:visible').all()) {
            await image.scrollIntoViewIfNeeded();
          }
          await page.waitForLoadState('networkidle');
          // Back to the top, where a reader starts: the sticky header and the hidden skip link
          // sit relative to the scroll position, and a full-page capture would show them mid-page.
          await page.evaluate(() => window.scrollTo(0, 0));

          await expect(page).toHaveScreenshot(`${name}-${width}-${theme}.png`, { fullPage: true });
        });
      }
    });
  }
}
