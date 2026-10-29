import { expect, test } from '@playwright/test';
import { TOOLS } from '../src/mcp/tool-info';

/** The Connect page: how a Visitor connects an AI assistant to the MCP endpoint. */

const ENDPOINT = 'https://inomov.online/api/mcp';

test.use({ reducedMotion: 'reduce' });

test('is in the main navigation in both languages', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('link', { name: 'KI verbinden' })
    .click();
  await expect(page).toHaveURL(/\/verbinden$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mit KI-Assistenten verbinden');

  await page.goto('/en');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Connect AI' })
    .click();
  await expect(page).toHaveURL(/\/en\/connect$/);
});

test('copies the endpoint and says so', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Only Chromium lets a test grant clipboard access.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/en/connect');

  // Found by the text it copies: its own name changes once it has copied.
  const button = page.locator('#endpoint-url + button');
  await expect(button).toHaveAccessibleDescription(ENDPOINT);
  await button.click();

  await expect(button).toHaveText('Copied');
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toBeAttached();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(ENDPOINT);
});

test('lists every tool of the server, the sending ones apart', async ({ page }) => {
  await page.goto('/en/connect');
  const tools = page.locator('.tool code');

  await expect(tools).toHaveText(TOOLS.map((tool) => tool.name));
  const send = page.locator('.tool-group--send .tool code');
  await expect(send).toHaveText(TOOLS.filter((tool) => tool.sends).map((tool) => tool.name));
});

test('offers the setup for Claude, ChatGPT and Cursor', async ({ page }) => {
  await page.goto('/verbinden');

  for (const name of ['Claude', 'ChatGPT', 'Cursor']) {
    await expect(page.getByRole('heading', { level: 3, name, exact: true })).toBeVisible();
  }
  await expect(page.getByText(`claude mcp add --transport http inomov ${ENDPOINT}`)).toBeVisible();
  const install = page.getByRole('link', { name: 'In Cursor hinzufügen' });
  const href = (await install.getAttribute('href')) ?? '';
  expect(href).toMatch(/^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=inomov&config=/);
  const config = new URL(href).searchParams.get('config') ?? '';
  expect(JSON.parse(Buffer.from(config, 'base64').toString())).toEqual({ url: ENDPOINT });
});

test('links to the privacy policy section on AI assistants', async ({ page }) => {
  await page.goto('/en/connect');

  await page.getByRole('link', { name: 'privacy policy' }).last().click();

  await expect(page).toHaveURL(/\/en\/privacy#contact-through-ai-assistants-mcp$/);
  await expect(
    page.getByRole('heading', { name: 'Contact through AI assistants (MCP)' }),
  ).toBeInViewport();
});
