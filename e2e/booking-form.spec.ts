import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The Intro Call booking on the Contact page. Cloudflare Turnstile, /api/slots and /api/booking
 * are stubbed, so the tests never reach Cal.com; the server side has its own unit tests.
 */

const TURNSTILE_STUB = `
  window.turnstile = {
    render: (_container, options) => { setTimeout(() => options.callback('stub-token')); return 'w1'; },
    reset: () => {},
  };
  window.onTurnstileLoad();
`;

/** Thursday and Friday, 17:00 and 17:30 Berlin time (UTC+1). */
const SLOTS = [
  '2026-10-29T16:00:00.000Z',
  '2026-10-29T16:30:00.000Z',
  '2026-10-30T16:00:00.000Z',
  '2026-10-30T16:30:00.000Z',
];

async function stubSlots(page: Page, slots: string[] | 'fail' = SLOTS) {
  await page.route('/api/slots', (route) =>
    slots === 'fail'
      ? route.fulfill({ status: 502, json: { ok: false, error: { code: 'slots_unavailable' } } })
      : route.fulfill({ json: { ok: true, slots } }),
  );
}

/** Opens the Contact page at the booking; Slots load only once the section comes near. */
async function openBooking(page: Page, path = '/en/contact') {
  await page.goto(path);
  const booking = page.locator('.booking');
  await booking.scrollIntoViewIfNeeded();
  return booking;
}

async function fillDetails(page: Page) {
  const booking = page.locator('.booking');
  await booking.getByLabel('Name', { exact: true }).fill('Ada Lovelace');
  await booking.getByLabel('Email', { exact: true }).fill('ada@example.com');
  await booking.getByLabel('Company', { exact: true }).fill('Analytical Engines');
  await booking.getByLabel('What would you like to talk about?').fill('A senior .NET role.');
  await booking.getByLabel(/I agree that my details are sent to Cal.com/).check();
}

test.use({ reducedMotion: 'reduce', timezoneId: 'Europe/Berlin' });

test.beforeEach(async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: TURNSTILE_STUB }),
  );
});

test('shows free Slots in the Visitor’s time zone and books one', async ({ page }) => {
  await stubSlots(page);
  let sent: Record<string, unknown> | undefined;
  await page.route('/api/booking', async (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ json: { ok: true } });
  });
  const booking = await openBooking(page);

  await expect(booking.getByText('Times in your time zone: Europe/Berlin')).toBeVisible();
  await expect(booking.getByRole('radio', { name: /Thu 10\/29/ })).toBeChecked();
  await booking.getByRole('radio', { name: /Fri 10\/30/ }).check();
  await booking.getByRole('radio', { name: '5:30 PM' }).check();
  await fillDetails(page);
  await booking.getByRole('button', { name: 'Request intro call' }).click();

  await expect(booking.getByRole('heading', { name: 'Request sent' })).toBeVisible();
  await expect(booking.getByText(/Friday, October 30.*5:30 PM/)).toBeVisible();
  expect(sent).toEqual({
    start: '2026-10-30T16:30:00.000Z',
    timeZone: 'Europe/Berlin',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines',
    reason: 'A senior .NET role.',
    consent: true,
    website: '',
    locale: 'en',
    turnstileToken: 'stub-token',
  });
});

test('asks for a time before anything else is sent', async ({ page }) => {
  await stubSlots(page);
  let requests = 0;
  await page.route('/api/booking', (route) => {
    requests += 1;
    return route.fulfill({ json: { ok: true } });
  });
  const booking = await openBooking(page);
  await expect(booking.getByRole('radio', { name: '5:00 PM' })).toBeVisible();

  await fillDetails(page);
  await booking.getByRole('button', { name: 'Request intro call' }).click();

  await expect(booking.getByText('Please choose a time.')).toBeVisible();
  await expect(booking.getByRole('radio', { name: /Thu/ })).toBeFocused();
  expect(requests).toBe(0);
});

test('reloads the Slots when the chosen one was just taken', async ({ page }) => {
  let loads = 0;
  await page.route('/api/slots', (route) => {
    loads += 1;
    return route.fulfill({ json: { ok: true, slots: loads === 1 ? SLOTS : SLOTS.slice(1) } });
  });
  await page.route('/api/booking', (route) =>
    route.fulfill({ status: 409, json: { ok: false, error: { code: 'slot_unavailable' } } }),
  );
  const booking = await openBooking(page);

  await booking.getByRole('radio', { name: '5:00 PM' }).check();
  await fillDetails(page);
  await booking.getByRole('button', { name: 'Request intro call' }).click();

  await expect(booking.getByRole('status')).toHaveText(/This time was just taken/);
  await expect(booking.getByRole('radio', { name: '5:00 PM' })).toHaveCount(0);
  await expect(booking.getByRole('radio', { name: '5:30 PM' })).toBeVisible();
});

test('explains when no Slot is free or Slots cannot be loaded', async ({ page }) => {
  await stubSlots(page, []);
  await openBooking(page, '/kontakt');
  await expect(
    page.getByText('In den nächsten zwei Wochen ist leider kein Termin frei.', { exact: false }),
  ).toBeVisible();

  await page.unroute('/api/slots');
  await stubSlots(page, 'fail');
  await openBooking(page, '/kontakt');
  await expect(page.getByText(/Die freien Termine konnten nicht geladen werden/)).toBeVisible();
});

test('the booking form has no WCAG 2.2 AA violations', async ({ page }) => {
  await stubSlots(page);
  const booking = await openBooking(page);
  await booking.getByRole('radio', { name: '5:00 PM' }).check();
  await booking.getByRole('button', { name: 'Request intro call' }).click();

  const { violations } = await new AxeBuilder({ page })
    .include('.booking')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(violations).toEqual([]);
});
