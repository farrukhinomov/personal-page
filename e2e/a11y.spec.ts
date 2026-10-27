import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { sitemapPaths, useTheme, type Theme } from './support';

/** Rules for WCAG 2.2 level A and AA, the site's target. */
const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const THEMES: Theme[] = ['light', 'dark'];

// Final state of every element: entry animations would make colour contrast flaky.
test.use({ reducedMotion: 'reduce' });

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await useTheme(page, theme);
    });

    for (const path of sitemapPaths()) {
      test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

        // Rule ids and the offending elements, so a failure says what to fix.
        const summary = violations.map((violation) => ({
          rule: violation.id,
          targets: violation.nodes.map((node) => node.target.join(' ')),
        }));
        expect(summary).toEqual([]);
      });
    }
  });
}
