import { expect, test } from '@playwright/test';

/** The switch between the Message form and the Intro Call booking on the Contact page. */

test.use({ reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  await page.route('/api/slots', (route) => route.fulfill({ json: { ok: true, slots: [] } }));
});

test('opens on the Message form and switches by keyboard, keeping the hash', async ({ page }) => {
  await page.goto('/en/contact');
  const message = page.getByRole('tab', { name: 'Write a message' });
  const call = page.getByRole('tab', { name: 'Book an intro call' });

  await expect(message).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Write a message' })).toBeVisible();
  await expect(page.locator('.booking')).toBeHidden();

  await message.focus();
  await page.keyboard.press('ArrowRight');

  await expect(call).toBeFocused();
  await expect(call).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Book an intro call' })).toBeVisible();
  await expect(page.locator('.message')).toBeHidden();
  expect(new URL(page.url()).hash).toBe('#intro-call');
});

test('a link to #intro-call opens the booking, also from the home page', async ({ page }) => {
  await page.goto('/');
  // The contact band fades in once it scrolls into view.
  const link = page.getByRole('link', { name: 'Intro Call buchen' });
  await page.locator('.contact-band').scrollIntoViewIfNeeded();
  await link.click();

  await expect(page).toHaveURL('/kontakt#intro-call');
  await expect(page.getByRole('tab', { name: 'Intro Call buchen' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.booking')).toBeVisible();
  await expect(page.locator('.message')).toBeHidden();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows both ways under their headings and no tabs', async ({ page }) => {
    await page.goto('/kontakt');

    await expect(page.getByRole('tablist')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Nachricht schreiben' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Intro Call buchen' })).toBeVisible();
  });
});
