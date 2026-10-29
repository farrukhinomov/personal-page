import type { Client } from '@modelcontextprotocol/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  experienceView,
  postListView,
  postView,
  profileView,
  projectListView,
  projectView,
  skillsView,
  type McpPost,
} from './catalog';
import { POSTS } from './catalog.fixture';
import { createPortfolioMcpHandler } from './handler';
import { CALLER_IP, connectClient, ENDPOINT, fakeServices, portfolioHandler } from './mcp.fixture';

const handler = portfolioHandler();

const READ_ONLY_TOOLS = [
  'get_profile',
  'get_experience',
  'get_skills',
  'list_projects',
  'get_project',
  'list_posts',
  'get_post',
];

const WRITE_TOOLS = ['get_available_slots', 'send_message', 'book_call'];

let client: Client | undefined;

afterEach(async () => {
  await client?.close();
  client = undefined;
});

async function connect(mode: 'auto' | 'legacy') {
  client = await connectClient(handler, mode);
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

  it('lists the tools, the read-only ones marked as such, with their schemas', async () => {
    const { tools } = await (await connect(mode)).listTools();

    expect(tools.map((tool) => tool.name)).toEqual([...READ_ONLY_TOOLS, ...WRITE_TOOLS]);
    for (const tool of tools.filter((candidate) => READ_ONLY_TOOLS.includes(candidate.name))) {
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

/** A 2025-era `initialize` as a plain HTTP client sends it. */
function initializeRequest(headers: Record<string, string> = {}, body?: string) {
  return new Request(ENDPOINT, {
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
  });
}

describe('the MCP endpoint over HTTP', () => {
  const initialize = (headers: Record<string, string> = {}, body?: string) =>
    handler.fetch(initializeRequest(headers, body), CALLER_IP);

  it('serves clients without an Origin header and pages of the site itself', async () => {
    expect((await initialize()).status).toBe(200);
    expect((await initialize({ Origin: 'https://inomov.online' })).status).toBe(200);
  });

  it('refuses browsers on other sites', async () => {
    expect((await initialize({ Origin: 'https://evil.example' })).status).toBe(403);
  });

  it('loads the Posts once per instance, and again only after a failed load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const loadPosts = vi
      .fn<() => Promise<{ de: McpPost[]; en: McpPost[] }>>()
      .mockRejectedValueOnce(new Error('collection unavailable'))
      .mockResolvedValue({ de: POSTS, en: POSTS });
    const fresh = createPortfolioMcpHandler({ loadPosts, services: fakeServices() });
    const post = () => fresh.fetch(initializeRequest(), CALLER_IP);

    expect((await post()).status).toBe(500);
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(200);
    expect(loadPosts).toHaveBeenCalledTimes(2);
  });

  it('refuses a body far larger than any tool call', async () => {
    const response = await initialize({}, JSON.stringify({ padding: 'x'.repeat(100 * 1024) }));

    expect(response.status).toBe(413);
  });
});
