import type { Client } from '@modelcontextprotocol/client';
import { afterEach, describe, expect, it } from 'vitest';
import { GET as getCatalog } from '@/pages/.well-known/ai-catalog.json';
import { GET as getServerCard } from '@/pages/api/mcp/server-card';
import {
  AI_CATALOG_TYPE,
  aiCatalog,
  MCP_ENDPOINT_URL,
  MCP_TOOLS,
  PROTOCOL_VERSIONS,
  SERVER_CARD_TYPE,
  serverCard,
} from './discovery';
import { CALLER_IP, connectClient, ENDPOINT, portfolioHandler } from './mcp.fixture';
import { TOOLS } from './tool-info';

let client: Client | undefined;

afterEach(async () => {
  await client?.close();
  client = undefined;
});

describe('serverCard', () => {
  it('follows the v1 Server Card format', () => {
    const card = serverCard();

    expect(card.$schema).toBe(
      'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    );
    expect(card.name).toMatch(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
    expect(card.description.length).toBeLessThanOrEqual(100);
    expect(card.title.length).toBeLessThanOrEqual(100);
    expect(card.remotes).toEqual([
      {
        type: 'streamable-http',
        url: 'https://inomov.online/api/mcp',
        supportedProtocolVersions: PROTOCOL_VERSIONS,
      },
    ]);
  });

  it('holds only public metadata', () => {
    const text = JSON.stringify(serverCard());

    expect(text).not.toMatch(/token|secret|password|\+\d{6,}/i);
  });
});

describe('aiCatalog', () => {
  it('points to the Server Card with a domain-anchored identifier', () => {
    expect(aiCatalog()).toEqual({
      specVersion: '1.0',
      host: {
        displayName: 'Farrukh Inomov',
        identifier: 'inomov.online',
        documentationUrl: 'https://inomov.online/en',
      },
      entries: [
        {
          identifier: 'urn:air:inomov.online:mcp:portfolio',
          type: 'application/mcp-server-card+json',
          url: 'https://inomov.online/api/mcp/server-card',
        },
      ],
    });
  });
});

describe('the discovery routes', () => {
  it.each([
    ['the Server Card', getServerCard, SERVER_CARD_TYPE, serverCard()],
    ['the AI Catalog', getCatalog, AI_CATALOG_TYPE, aiCatalog()],
  ])('serve %s with its media type, open CORS and caching', async (_, get, type, body) => {
    const response = await get({} as Parameters<typeof get>[0]);

    expect(response.headers.get('Content-Type')).toBe(type);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600, s-maxage=3600');
    expect(await response.json()).toEqual(body);
  });
});

describe('the Server Card matches the running server', () => {
  it('names the same server, version and tools', async () => {
    client = await connectClient(portfolioHandler());
    const { tools } = await client.listTools();

    expect(client.getServerVersion()).toMatchObject({
      name: serverCard().name,
      version: serverCard().version,
    });
    expect(tools.map((tool) => tool.name)).toEqual([...MCP_TOOLS]);
  });

  it('registers each tool with the title and kind the Connect page shows', async () => {
    client = await connectClient(portfolioHandler());
    const { tools } = await client.listTools();

    expect(
      tools.map((tool) => ({
        name: tool.name,
        title: tool.title,
        sends: tool.annotations?.readOnlyHint === false,
      })),
    ).toEqual(TOOLS.map((tool) => ({ name: tool.name, title: tool.title.en, sends: tool.sends })));
  });

  it('serves the newest protocol revision it advertises', async () => {
    client = await connectClient(portfolioHandler(), 'auto');

    expect(client.getNegotiatedProtocolVersion()).toBe(PROTOCOL_VERSIONS[0]);
  });

  it.each(PROTOCOL_VERSIONS.slice(1))('serves 2025-era clients on %s', async (version) => {
    const response = await portfolioHandler().fetch(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: version,
            capabilities: {},
            clientInfo: { name: 'test', version: '1' },
          },
        }),
      }),
      CALLER_IP,
    );
    const data = (await response.text()).split('\n').find((line) => line.startsWith('data:'));

    expect(JSON.parse(data?.slice(5) ?? '{}').result?.protocolVersion).toBe(version);
  });

  it('is reachable at the endpoint it names', () => {
    expect(MCP_ENDPOINT_URL).toBe(ENDPOINT);
  });
});
