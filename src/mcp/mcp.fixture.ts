import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { vi } from 'vitest';
import { POSTS } from './catalog.fixture';
import { createPortfolioMcpHandler, type PortfolioMcpHandler } from './handler';
import type { WriteServices } from './write-tools';

/** For tests: the MCP endpoint, real MCP clients that reach it in process, and fake services. */

export const ENDPOINT = 'https://inomov.online/api/mcp';
export const CALLER_IP = '203.0.113.7';

/** Thursday 29 October 2026, 17:00 and 17:30 Berlin time. */
export const SLOTS = ['2026-10-29T16:00:00.000Z', '2026-10-29T16:30:00.000Z'];

export function fakeServices(overrides: Partial<Omit<WriteServices, 'ip'>> = {}) {
  return {
    rateLimit: vi
      .fn<WriteServices['rateLimit']>()
      .mockResolvedValue({ allowed: true, remaining: 2 }),
    send: vi.fn<WriteServices['send']>().mockResolvedValue(undefined),
    listSlots: vi.fn<WriteServices['listSlots']>().mockResolvedValue(SLOTS),
    slots: vi.fn<WriteServices['slots']>().mockResolvedValue(SLOTS),
    book: vi.fn<WriteServices['book']>().mockResolvedValue({ kind: 'requested', uid: 'abc' }),
    count: vi.fn<WriteServices['count']>().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function portfolioHandler(services = fakeServices()): PortfolioMcpHandler {
  return createPortfolioMcpHandler({
    loadPosts: async () => ({ de: POSTS, en: POSTS }),
    services,
  });
}

/** A real MCP client whose requests reach `handler` in process, never the network. */
export async function connectClient(
  handler: PortfolioMcpHandler,
  mode: 'auto' | 'legacy' = 'auto',
): Promise<Client> {
  const client = new Client({ name: 'test', version: '1.0.0' }, { versionNegotiation: { mode } });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(ENDPOINT), {
      fetch: (url, init) => handler.fetch(new Request(url, init), CALLER_IP),
    }),
  );
  return client;
}
