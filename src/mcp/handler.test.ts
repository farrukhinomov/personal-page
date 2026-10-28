import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { afterEach, describe, expect, it } from 'vitest';
import {
  experienceView,
  postListView,
  postView,
  profileView,
  projectListView,
  projectView,
  skillsView,
} from './catalog';
import { POSTS } from './catalog.fixture';
import { createPortfolioMcpHandler } from './handler';

const ENDPOINT = 'https://inomov.online/api/mcp';
const handler = createPortfolioMcpHandler(async () => ({ de: POSTS, en: POSTS }));

const TOOLS = [
  'get_profile',
  'get_experience',
  'get_skills',
  'list_projects',
  'get_project',
  'list_posts',
  'get_post',
];

let client: Client | undefined;

afterEach(async () => {
  await client?.close();
  client = undefined;
});

/** A real MCP client whose requests reach the handler in process, never the network. */
async function connect(mode: 'auto' | 'legacy') {
  client = new Client({ name: 'test', version: '1.0.0' }, { versionNegotiation: { mode } });
  const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  });
  await client.connect(transport);
  return client;
}

// "auto" speaks the 2026-07-28 revision; "legacy" is a 2025-era client such as most hosts today.
describe.each([
  ['auto', /^2026-/],
  ['legacy', /^2025-/],
] as const)('the MCP endpoint with a %s client', (mode, revision) => {
  it('introduces the Portfolio in the client’s protocol revision', async () => {
    const mcp = await connect(mode);

    expect(mcp.getNegotiatedProtocolVersion()).toMatch(revision);
    expect(mcp.getServerVersion()).toMatchObject({ name: 'inomov-online', version: '1.0.0' });
    expect(mcp.getInstructions()).toContain('Farrukh Inomov');
  });

  it('lists the read-only tools with their schemas', async () => {
    const { tools } = await (await connect(mode)).listTools();

    expect(tools.map((tool) => tool.name)).toEqual(TOOLS);
    for (const tool of tools) {
      expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
      expect(tool.outputSchema).toBeDefined();
      expect(tool.inputSchema.properties?.lang).toMatchObject({ enum: ['de', 'en'] });
    }
  });

  it.each([
    ['get_profile', { lang: 'de' }, profileView('de')],
    ['get_experience', { lang: 'en', kind: 'work' }, experienceView('en', 'work')],
    ['get_skills', { lang: 'de' }, skillsView('de')],
    ['list_projects', { lang: 'en' }, projectListView('en')],
    ['get_project', { lang: 'de', slug: 'kritis-grc' }, projectView('kritis-grc', 'de')],
    ['list_posts', { lang: 'en' }, postListView(POSTS, 'en')],
    [
      'get_post',
      { lang: 'en', slug: 'react-quality-gates' },
      postView(POSTS, 'react-quality-gates', 'en'),
    ],
  ])('answers %s with the same data as the site', async (name, args, expected) => {
    const result = await (await connect(mode)).callTool({ name, arguments: args });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual(expected);
    const [text] = result.content as { type: string; text?: string }[];
    expect(text?.type).toBe('text');
    expect(JSON.parse(text?.text ?? '')).toEqual(expected);
  });

  it('answers in English when no language is given', async () => {
    const result = await (await connect(mode)).callTool({ name: 'get_profile', arguments: {} });

    expect(result.structuredContent).toEqual(profileView('en'));
  });

  it('explains arguments it cannot use, so the model can try again', async () => {
    const mcp = await connect(mode);

    const language = await mcp.callTool({ name: 'get_profile', arguments: { lang: 'fr' } });
    const slug = await mcp.callTool({ name: 'get_project', arguments: { slug: 'nope' } });

    expect(language.isError).toBe(true);
    expect(JSON.stringify(language.content)).toContain('lang');
    expect(slug.isError).toBe(true);
    expect(JSON.stringify(slug.content)).toContain('slug');
  });
});

describe('the MCP endpoint over HTTP', () => {
  const initialize = (headers: Record<string, string> = {}, body?: string) =>
    handler.fetch(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...headers,
        },
        body:
          body ??
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2025-06-18',
              capabilities: {},
              clientInfo: { name: 'curl', version: '1' },
            },
          }),
      }),
    );

  it('serves clients without an Origin header and pages of the site itself', async () => {
    expect((await initialize()).status).toBe(200);
    expect((await initialize({ Origin: 'https://inomov.online' })).status).toBe(200);
  });

  it('refuses browsers on other sites', async () => {
    expect((await initialize({ Origin: 'https://evil.example' })).status).toBe(403);
  });

  it('refuses a body far larger than any tool call', async () => {
    const response = await initialize({}, JSON.stringify({ padding: 'x'.repeat(100 * 1024) }));

    expect(response.status).toBe(413);
  });
});
