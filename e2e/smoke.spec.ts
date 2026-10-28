import { expect, test, type Page } from '@playwright/test';
import { localeOf, sitemapPaths } from './support';

/** WCAG 2.2 AA target size (2.5.8) for links and buttons that are not part of running text. */
const MIN_TARGET_PX = 24;
const NARROWEST_PHONE = { width: 320, height: 700 };

/** Fails the test on any console error or uncaught exception, e.g. a script blocked by the CSP. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

for (const path of sitemapPaths()) {
  test.describe(path, () => {
    test('loads with one heading, its language and no errors', async ({ page }) => {
      const errors = collectErrors(page);
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', localeOf(path));
      await expect(page).toHaveTitle(/Farrukh Inomov/);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main')).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(errors).toEqual([]);
      // The privacy policy promises no cookies, which is why there is no consent banner.
      expect(await page.context().cookies()).toEqual([]);
    });

    test.describe('on the narrowest phone', () => {
      test.use({ viewport: NARROWEST_PHONE });

      test('does not scroll sideways', async ({ page }) => {
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBe(0);
      });

      test('has links and buttons large enough to tap', async ({ page }) => {
        await page.goto(path);
        // Links inside running text are exempt (WCAG 2.5.8 "inline" exception).
        const tooSmall = await page.evaluate((min) => {
          const inText = 'p, label, .prose, dd, figcaption, td';
          return [...document.querySelectorAll<HTMLElement>('a, button, input')]
            .filter((element) => element.offsetParent !== null && !element.closest(inText))
            .filter((element) => element.getBoundingClientRect().height < min)
            .map((element) => element.textContent?.trim() || element.outerHTML.slice(0, 80));
        }, MIN_TARGET_PX);
        expect(tooSmall).toEqual([]);
      });
    });
  });
}

test('unknown paths show the 404 page in both languages', async ({ page }) => {
  const response = await page.goto('/gibt-es-nicht');

  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('[lang="en"] h2')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});
