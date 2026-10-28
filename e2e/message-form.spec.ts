import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The Message form on the Contact page. Cloudflare Turnstile and /api/message are stubbed,
 * so the tests never leave the machine; the server side has its own unit tests.
 */

/** Stands in for Cloudflare's script: renders nothing and hands out a token at once. */
const TURNSTILE_STUB = `
  window.turnstile = {
    render: (_container, options) => { setTimeout(() => options.callback('stub-token')); return 'w1'; },
    reset: () => { window.turnstileResets = (window.turnstileResets || 0) + 1; },
  };
  window.onTurnstileLoad();
`;

async function stubTurnstile(page: Page) {
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: TURNSTILE_STUB }),
  );
}

async function fillValid(page: Page) {
  await page.locator('.message').getByLabel('Name', { exact: true }).fill('Ada Lovelace');
  await page.locator('.message').getByLabel('Email', { exact: true }).fill('ada@example.com');
  await page.locator('.message').getByLabel('Topic', { exact: true }).selectOption('job');
  await page
    .getByLabel('Message', { exact: true })
    .fill('We would like to talk about a senior .NET role.');
  await page
    .locator('.message')
    .getByLabel(/I agree/)
    .check();
}

test.use({ reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
  await page.goto('/en/contact');
});

test('sends a Message and shows the confirmation', async ({ page }) => {
  let sent: Record<string, unknown> | undefined;
  await page.route('/api/message', async (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ json: { ok: true } });
  });

  await fillValid(page);
  await page.locator('.message').getByRole('button', { name: 'Send message' }).click();

  await expect(
    page.locator('.message').getByRole('heading', { name: 'Message sent' }),
  ).toBeVisible();
  await expect(page.locator('.message [data-message-form]')).toBeHidden();
  expect(sent).toEqual({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: '',
    topic: 'job',
    message: 'We would like to talk about a senior .NET role.',
    consent: true,
    website: '',
    locale: 'en',
    turnstileToken: 'stub-token',
  });
});

const PDF = { name: 'role.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7') };
const PNG = {
  name: 'screenshot.png',
  mimeType: 'image/png',
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
};

test('sends attached files with the Message as multipart', async ({ page }) => {
  let request: { type: string; body: string } | undefined;
  await page.route('/api/message', async (route) => {
    request = {
      type: (await route.request().headerValue('content-type')) ?? '',
      body: route.request().postDataBuffer()?.toString('latin1') ?? '',
    };
    await route.fulfill({ json: { ok: true } });
  });
  const message = page.locator('.message');

  await fillValid(page);
  await message.getByLabel('Choose files').setInputFiles([PDF, PNG]);
  await expect(message.getByRole('list', { name: 'Attachments (optional)' })).toContainText(
    'role.pdf',
  );
  await message.getByRole('button', { name: 'Remove screenshot.png' }).click();
  await expect(message.getByText('screenshot.png')).toBeHidden();
  await expect(message.getByRole('button', { name: 'Remove role.pdf' })).toBeFocused();
  await message.getByRole('button', { name: 'Send message' }).click();

  await expect(message.getByRole('heading', { name: 'Message sent' })).toBeVisible();
  expect(request?.type).toMatch(/^multipart\/form-data; boundary=/);
  expect(request?.body).toContain('name="json"');
  expect(request?.body).toContain('"topic":"job"');
  expect(request?.body).toContain('name="attachments"; filename="role.pdf"');
  expect(request?.body).not.toContain('screenshot.png');
});

test('explains files that cannot be sent and keeps the Message back', async ({ page }) => {
  let requests = 0;
  await page.route('/api/message', (route) => {
    requests += 1;
    return route.fulfill({ json: { ok: true } });
  });
  const message = page.locator('.message');
  const picker = message.getByLabel('Choose files');
  await fillValid(page);

  await picker.setInputFiles({
    name: 'setup.exe',
    mimeType: 'application/x-msdownload',
    buffer: Buffer.from('MZ'),
  });
  await expect(message.getByText(/This file is not possible: setup.exe/)).toBeVisible();
  await expect(message.getByRole('list', { name: 'Attachments (optional)' })).toBeHidden();

  const many = ['a', 'b', 'c', 'd'].map((name) => ({ ...PDF, name: `${name}.pdf` }));
  await picker.setInputFiles(many);
  await expect(message.getByText('Please attach at most 3 files.')).toBeVisible();
  await message.getByRole('button', { name: 'Send message' }).click();

  await expect(picker).toBeFocused();
  await expect(picker).toHaveAttribute('aria-invalid', 'true');
  await message.getByRole('button', { name: 'Remove d.pdf' }).click();
  await expect(message.getByText('Please attach at most 3 files.')).toBeHidden();
  expect(requests).toBe(0);
});

test('shows every problem on submit and sends nothing', async ({ page }) => {
  let requests = 0;
  await page.route('/api/message', (route) => {
    requests += 1;
    return route.fulfill({ json: { ok: true } });
  });

  await page.locator('.message').getByLabel('Email', { exact: true }).fill('not-an-email');
  await page.locator('.message').getByRole('button', { name: 'Send message' }).click();

  await expect(page.locator('.message').getByText('Please enter your name.')).toBeVisible();
  await expect(
    page.locator('.message').getByText('This email address is not valid.'),
  ).toBeVisible();
  await expect(page.locator('.message').getByText('Please choose a topic.')).toBeVisible();
  await expect(page.locator('.message').getByText('Please write a message.')).toBeVisible();
  await expect(
    page.locator('.message').getByText('Please agree so that I can reply.'),
  ).toBeVisible();
  await expect(page.locator('.message').getByLabel('Name', { exact: true })).toBeFocused();
  await expect(page.locator('.message').getByLabel('Name', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(requests).toBe(0);
});

test('validates a field when it is left and clears the error once fixed', async ({ page }) => {
  const message = page.locator('.message').getByLabel('Message', { exact: true });
  await message.fill('Too short');
  await message.blur();
  await expect(
    page.locator('.message').getByText('Please write at least 20 characters.'),
  ).toBeVisible();

  await message.fill('Now this message is long enough.');
  await expect(
    page.locator('.message').getByText('Please write at least 20 characters.'),
  ).toBeHidden();
  await expect(page.locator('.message').getByText('32 / 5000')).toBeVisible();
});

test('explains a rate limit and gets a fresh bot check', async ({ page }) => {
  await page.route('/api/message', (route) =>
    route.fulfill({
      status: 429,
      json: { ok: false, error: { code: 'rate_limited', message: 'Too many requests.' } },
    }),
  );

  await fillValid(page);
  await page.locator('.message').getByRole('button', { name: 'Send message' }).click();

  await expect(page.locator('.message').getByRole('status')).toHaveText(
    'No more messages are possible today. Feel free to email me instead.',
  );
  await expect(page.locator('.message [data-message-form]')).toBeVisible();
  expect(await page.evaluate(() => (window as { turnstileResets?: number }).turnstileResets)).toBe(
    1,
  );
});

test('falls back to a general error when the server fails', async ({ page }) => {
  await page.route('/api/message', (route) => route.fulfill({ status: 500, body: 'oops' }));

  await fillValid(page);
  await page.locator('.message').getByRole('button', { name: 'Send message' }).click();

  await expect(page.locator('.message').getByRole('status')).toHaveText(
    'The message could not be sent. Please try again later or email me.',
  );
});

test('loads Turnstile only once the Visitor starts on the form', async ({ page }) => {
  const turnstile = page.locator('script[src^="https://challenges.cloudflare.com"]');
  await expect(turnstile).toHaveCount(0);

  await page.locator('.message').getByLabel('Name', { exact: true }).focus();

  await expect(turnstile).toHaveCount(1);
});

test('the filled form and the confirmation have no WCAG 2.2 AA violations', async ({ page }) => {
  await page.route('/api/message', (route) => route.fulfill({ json: { ok: true } }));
  const axe = () =>
    new AxeBuilder({ page })
      .include('.message')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

  await page.locator('.message').getByRole('button', { name: 'Send message' }).click();
  expect((await axe()).violations).toEqual([]);

  await fillValid(page);
  await page.locator('.message').getByLabel('Choose files').setInputFiles(PDF);
  expect((await axe()).violations).toEqual([]);

  await page.locator('.message').getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.message [data-sent]')).toBeFocused();
  expect((await axe()).violations).toEqual([]);
});
