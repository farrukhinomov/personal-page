import { expect, test, type Page } from '@playwright/test';

/** The browser-only scripts: terminal, menu, theme toggle, language switch and motion. */

function terminal(page: Page) {
  const input = page.locator('[data-terminal] [data-input]');
  const screen = page.locator('[data-terminal] [data-screen]');
  const run = async (command: string) => {
    await input.fill(command);
    await input.press('Enter');
  };
  return { input, screen, run };
}

test.describe('terminal', () => {
  // No self-typing demo, so every test starts from the welcome lines.
  test.use({ reducedMotion: 'reduce' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('runs commands and reports unknown ones', async ({ page }) => {
    const { screen, run } = terminal(page);

    await run('help');
    await expect(screen).toContainText('Verfügbare Befehle:');
    await expect(screen).toContainText('whoami');

    await run('whoami');
    await expect(screen).toContainText('Farrukh Inomov');

    await run('sudo');
    await expect(screen).toContainText('Befehl nicht gefunden: sudo');
  });

  test('completes with Tab and recalls history with the arrow keys', async ({ page }) => {
    const { input, run } = terminal(page);

    // A completed command ends with a space, ready for an argument.
    await input.fill('who');
    await input.press('Tab');
    await expect(input).toHaveValue('whoami ');

    await run('skills');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('skills');
  });

  test('runs suggested commands and clears the screen', async ({ page }) => {
    const { screen, run } = terminal(page);

    await page.locator('[data-terminal] [data-command="projects"]').click();
    await expect(screen.getByRole('link', { name: 'KRITIS GRC' })).toBeVisible();

    await run('clear');
    await expect(screen.locator('.line')).toHaveCount(0);
  });

  test('opens pages and switches the language', async ({ page }) => {
    const { run } = terminal(page);

    await run('open about');
    await expect(page).toHaveURL('/ueber-mich');

    await page.goto('/');
    await run('lang');
    await expect(page).toHaveURL('/en');
  });
});

test('terminal types a demo command when it comes into view', async ({ page }) => {
  await page.goto('/');
  const { screen } = terminal(page);

  await screen.scrollIntoViewIfNeeded();
  await expect(screen.locator('.line--input')).toHaveText('whoami');
  await expect(screen).toContainText('Farrukh Inomov');
});

test.describe('menu on phones', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('opens, closes with Escape and returns focus', async ({ page }) => {
    await page.goto('/');
    // Located by what it controls: its name changes from "open" to "close".
    const toggle = page.locator('button[aria-controls="site-menu"]');
    const menu = page.locator('#site-menu');

    await expect(toggle).toHaveAccessibleName('Menü öffnen');

    await expect(menu).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAccessibleName('Menü schließen');
    await expect(menu.getByRole('link', { name: 'Projekte' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('navigates from the open menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menü öffnen' }).click();
    await page.locator('#site-menu').getByRole('link', { name: 'Kontakt' }).click();
    await expect(page).toHaveURL('/kontakt');
  });
});

test('theme toggle switches the theme and remembers it', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.locator('.theme-toggle');

  await expect(html).toHaveAttribute('data-theme', 'light');
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/projekte');
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('language switch opens the same page in the other language', async ({ page }) => {
  await page.goto('/projekte/kritis-grc');
  await page.getByRole('link', { name: 'EN – Switch to English' }).click();

  await expect(page).toHaveURL('/en/projects/kritis-grc');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.getByRole('link', { name: 'DE – Auf Deutsch lesen' }).click();
  await expect(page).toHaveURL('/projekte/kritis-grc');
});

/** Animated elements not yet in their final state: hidden, shifted or collapsed. */
function pendingReveals(page: Page, { includeTrace }: { includeTrace: boolean }) {
  return page.evaluate((withTrace) => {
    const moved = (element: Element) => {
      const transform = getComputedStyle(element).transform;
      return transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)';
    };
    const fades = [...document.querySelectorAll('[data-reveal="fade"]')].filter(
      (element) => getComputedStyle(element).opacity !== '1' || moved(element),
    );
    const lines = [...document.querySelectorAll('[data-reveal="lines"] *')].filter(moved);
    const trace = withTrace
      ? [
          ...[...document.querySelectorAll('[data-trace-bar]')].filter(moved),
          ...[...document.querySelectorAll('[data-trace-duration]')].filter(
            (element) => getComputedStyle(element).opacity !== '1',
          ),
        ]
      : [];
    return fades.length + lines.length + trace.length;
  }, includeTrace);
}

test('scroll reveals end with every element in its final state', async ({ page }) => {
  await page.goto('/ueber-mich');

  // GSAP loads when the page is idle and then hides what is below the fold; wait for that,
  // or scrolling first would leave nothing to animate.
  await expect.poll(() => pendingReveals(page, { includeTrace: false })).toBeGreaterThan(0);

  // Scroll step by step so every ScrollTrigger fires, as it would for a reader.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });

  await expect.poll(() => pendingReveals(page, { includeTrace: true })).toBe(0);
});

test('reduced motion shows everything without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/ueber-mich');

  await expect(page.locator('html')).not.toHaveAttribute('data-motion');
  expect(await pendingReveals(page, { includeTrace: true })).toBe(0);
});
