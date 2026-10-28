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

/** Opens the Contact page on the booking tab, where the Slots load once the form shows. */
async function openBooking(page: Page, path = '/en/contact') {
  await page.goto(`${path}#intro-call`);
  return page.locator('.booking');
}

/** Picks a time and goes on to step 2, the details. */
async function chooseTime(page: Page, time: string) {
  const booking = page.locator('.booking');
  await booking.getByRole('radio', { name: time }).check();
  await booking.getByRole('button', { name: 'Continue' }).click();
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
  // Week pages start at the current week: Wednesday, 28 October 2026.
  await page.clock.setFixedTime(new Date('2026-10-28T10:00:00+01:00'));
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
  await expect(booking.getByText('Oct 26 – 30')).toBeVisible();
  await expect(booking.getByRole('radio', { name: 'Thu 29' })).toBeChecked();
  await expect(booking.getByRole('radio', { name: 'Mon 26' })).toBeDisabled();
  await booking.getByRole('radio', { name: 'Fri 30' }).check();
  await chooseTime(page, '5:30 PM');
  await expect(booking.getByText('Friday, October 30 at 5:30 PM')).toBeVisible();
  await expect(booking.getByLabel('Name', { exact: true })).toBeFocused();
  await fillDetails(page);
  await booking.getByRole('button', { name: 'Request intro call' }).click();

  await expect(booking.getByRole('heading', { name: 'Request sent' })).toBeVisible();
  await expect(
    booking.getByText(/Friday, October 30.*5:30 PM/).filter({ visible: true }),
  ).toBeVisible();
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

test('asks for a time before the details, and goes back to change it', async ({ page }) => {
  await stubSlots(page);
  const booking = await openBooking(page);
  await expect(booking.getByRole('radio', { name: '5:00 PM' })).toBeVisible();

  await booking.getByRole('button', { name: 'Continue' }).click();

  await expect(booking.getByText('Please choose a time.')).toBeVisible();
  await expect(booking.getByRole('radio', { name: '5:00 PM' })).toBeFocused();
  await expect(booking.getByLabel('Name', { exact: true })).toBeHidden();

  await chooseTime(page, '5:00 PM');
  await booking.getByRole('button', { name: 'Change' }).click();

  await expect(booking.getByRole('radio', { name: '5:00 PM' })).toBeFocused();
  await expect(booking.getByRole('radio', { name: '5:00 PM' })).toBeChecked();
});

test('forgets a chosen time once its day is no longer shown', async ({ page }) => {
  await stubSlots(page);
  const booking = await openBooking(page);
  await booking.getByRole('radio', { name: '5:00 PM' }).check();

  await booking.getByRole('radio', { name: 'Fri 30' }).check();
  await booking.getByRole('button', { name: 'Continue' }).click();

  await expect(booking.getByText('Please choose a time.')).toBeVisible();
});

test('pages through the weeks of the booking window', async ({ page }) => {
  await stubSlots(page, [...SLOTS, '2026-11-04T16:00:00.000Z']);
  const booking = await openBooking(page);
  const previous = booking.getByRole('button', { name: 'Previous week' });
  const next = booking.getByRole('button', { name: 'Next week' });
  await expect(previous).toBeDisabled();

  await next.click();

  await expect(booking.getByText('Nov 2 – 6')).toBeVisible();
  await expect(booking.getByRole('radio', { name: 'Wed 4' })).toBeChecked();
  await expect(next).toBeDisabled();
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

  await chooseTime(page, '5:00 PM');
  await fillDetails(page);
  await booking.getByRole('button', { name: 'Request intro call' }).click();

  await expect(
    booking.getByText(/This time was just taken/).filter({ visible: true }),
  ).toBeVisible();
  await expect(booking.getByLabel('Name', { exact: true })).toBeHidden();
  await expect(booking.locator('[data-picker-state]')).toBeFocused();
  await expect(booking.getByRole('radio', { name: '5:00 PM' })).toHaveCount(0);
  await expect(booking.getByRole('radio', { name: '5:30 PM' })).toBeVisible();
});

test('explains when no Slot is free or Slots cannot be loaded', async ({ page }) => {
  await stubSlots(page, []);
  await openBooking(page, '/kontakt');
  await expect(
    page.getByText('In den nächsten 30 Tagen ist leider kein Termin frei.', { exact: false }),
  ).toBeVisible();

  await page.unroute('/api/slots');
  await stubSlots(page, 'fail');
  // The same URL again would only scroll to the hash, so load the page anew.
  await page.reload();
  await expect(page.getByText(/Die freien Termine konnten nicht geladen werden/)).toBeVisible();
});

test('the booking form has no WCAG 2.2 AA violations', async ({ page }) => {
  await stubSlots(page);
  const booking = await openBooking(page);
  await chooseTime(page, '5:00 PM');
  await booking.getByRole('button', { name: 'Request intro call' }).click();

  const { violations } = await new AxeBuilder({ page })
    .include('.booking')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(violations).toEqual([]);
});
