import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { pathFor } from '@/i18n/routes';
import { HEALTH_CHECK_AGENT } from '@/mcp/handler';
import {
  AI_CATALOG_PATH,
  AI_CATALOG_TYPE,
  MCP_ENDPOINT_PATH,
  MCP_TOOLS,
  SERVER_CARD_PATH,
  SERVER_CARD_TYPE,
  SERVER_NAME,
} from '@/mcp/discovery';

/**
 * The daily health check of the live site. Every check only reads: none sends a message or
 * books a call, so running it never reaches Farrukh's inbox or calendar.
 */

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface HealthOptions {
  fetch?: typeof fetch;
  /** Waits before a failed check runs again; injectable so tests do not wait. */
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}

type Fetch = typeof fetch;
type Check = { name: string; run: () => Promise<string> };

const USER_AGENT = HEALTH_CHECK_AGENT;
const RETRY_DELAY_MS = 10_000;
const TIMEOUT_MS = 20_000;

const PAGES = [
  pathFor('home', 'de'),
  pathFor('home', 'en'),
  pathFor('connect', 'de'),
  pathFor('connect', 'en'),
];

/** Runs every check; a failed check runs once more, so one dropped request raises no alarm. */
export async function runHealthChecks(
  baseUrl: string,
  options: HealthOptions = {},
): Promise<CheckResult[]> {
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const request = identified(options.fetch ?? fetch);
  const checks = healthChecks(baseUrl, request);

  const first = await Promise.all(checks.map((check) => attempt(check, timeoutMs)));
  if (first.every((result) => result.ok)) return first;

  await sleep(RETRY_DELAY_MS);
  return Promise.all(
    checks.map((check, i) => (first[i]?.ok ? first[i] : attempt(check, timeoutMs))),
  );
}

function healthChecks(baseUrl: string, request: Fetch): Check[] {
  const url = (path: string) => new URL(path, baseUrl);
  return [
    ...PAGES.map((path) => ({ name: `Page ${path}`, run: () => checkPage(request, url(path)) })),
    {
      name: 'Server Card',
      run: () =>
        checkJson(request, url(SERVER_CARD_PATH), SERVER_CARD_TYPE, (card) =>
          card['name'] === SERVER_NAME ? undefined : `names ${String(card['name'])}`,
        ),
    },
    {
      name: 'AI Catalog',
      run: () =>
        checkJson(request, url(AI_CATALOG_PATH), AI_CATALOG_TYPE, (catalog) => {
          const entries = catalog['entries'] as { url?: string }[] | undefined;
          const target = url(SERVER_CARD_PATH).pathname;
          return entries?.some((entry) => entry.url?.endsWith(target))
            ? undefined
            : 'does not point to the Server Card';
        }),
    },
    { name: 'MCP tools', run: () => checkTools(request, url(MCP_ENDPOINT_PATH)) },
    { name: 'Intro Call slots', run: () => checkSlots(request, url(MCP_ENDPOINT_PATH)) },
  ];
}

async function attempt(check: Check, timeoutMs: number): Promise<CheckResult> {
  try {
    const detail = await withTimeout(check.run(), timeoutMs);
    return { name: check.name, ok: true, detail };
  } catch (error) {
    return { name: check.name, ok: false, detail: errorText(error) };
  }
}

async function checkPage(request: Fetch, url: URL): Promise<string> {
  const response = await request(url);
  expectStatus(response);
  const type = response.headers.get('Content-Type') ?? '';
  if (!type.startsWith('text/html')) throw new Error(`Content-Type is ${type}`);
  if (!/<h1[\s>]/.test(await response.text())) throw new Error('no <h1> on the page');
  return 'HTTP 200';
}

async function checkJson(
  request: Fetch,
  url: URL,
  type: string,
  problem: (body: Record<string, unknown>) => string | undefined,
): Promise<string> {
  const response = await request(url);
  expectStatus(response);
  const actual = response.headers.get('Content-Type') ?? '';
  if (!actual.startsWith(type)) throw new Error(`Content-Type is ${actual}`);
  const found = problem((await response.json()) as Record<string, unknown>);
  if (found) throw new Error(found);
  return 'HTTP 200';
}

async function checkTools(request: Fetch, endpoint: URL): Promise<string> {
  return withClient(request, endpoint, async (client) => {
    const { tools } = await client.listTools();
    const names = new Set(tools.map((tool) => tool.name));
    const missing = MCP_TOOLS.filter((name) => !names.has(name));
    if (missing.length > 0) throw new Error(`missing tools: ${missing.join(', ')}`);
    return `${tools.length} tools`;
  });
}

async function checkSlots(request: Fetch, endpoint: URL): Promise<string> {
  return withClient(request, endpoint, async (client) => {
    const result = await client.callTool({
      name: 'get_available_slots',
      arguments: { lang: 'en' },
    });
    if (result.isError) throw new Error(toolText(result.content));
    const slots = (result.structuredContent as { slots?: unknown[] } | undefined)?.slots ?? [];
    // An empty calendar for the whole booking window means the Cal.com setup is broken.
    if (slots.length === 0) throw new Error('no free time in the booking window');
    return `${slots.length} free times`;
  });
}

async function withClient<T>(
  request: Fetch,
  endpoint: URL,
  use: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ name: USER_AGENT, version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(endpoint, { fetch: request }));
  try {
    return await use(client);
  } finally {
    await client.close();
  }
}

/** Every request says what it is, so the server logs can tell it apart from Visitors. */
function identified(request: Fetch): Fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('User-Agent', USER_AGENT);
    return request(input, { ...init, headers });
  };
}

function expectStatus(response: Response): void {
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
}

function toolText(content: unknown): string {
  const first = (content as { text?: string }[] | undefined)?.[0];
  return first?.text ?? 'the tool returned an error';
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer within ${ms / 1000} s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
