import { describe, expect, it, vi } from 'vitest';
import { GET as getCatalog } from '@/pages/.well-known/ai-catalog.json';
import { GET as getServerCard } from '@/pages/api/mcp/server-card';
import { CALLER_IP, fakeServices, portfolioHandler } from '@/mcp/mcp.fixture';
import { runHealthChecks, type HealthOptions } from './health';

const BASE = 'https://inomov.online';
const HTML = { 'Content-Type': 'text/html; charset=utf-8' };

type Route = (request: Request) => Response | Promise<Response> | undefined;

/** The live site in process: real MCP handler and discovery routes, stub pages. */
function site(services = fakeServices(), override: Route = () => undefined) {
  const handler = portfolioHandler(services);
  const requests: Request[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request);
    const overridden = await override(request);
    if (overridden) return overridden;
    const { pathname } = new URL(request.url);
    if (pathname === '/api/mcp/server-card') return getServerCard({} as never);
    if (pathname === '/.well-known/ai-catalog.json') return getCatalog({} as never);
    if (pathname === '/api/mcp') return handler.fetch(request, CALLER_IP);
    return new Response('<main><h1>Farrukh Inomov</h1></main>', { headers: HTML });
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, requests, services };
}

function run(fetch: typeof globalThis.fetch, options: HealthOptions = {}) {
  return runHealthChecks(BASE, { fetch, sleep: async () => undefined, ...options });
}

const failed = (results: { name: string; ok: boolean; detail: string }[]) =>
  results.filter((result) => !result.ok).map(({ name, detail }) => ({ name, detail }));

describe('runHealthChecks', () => {
  it('passes every check against a healthy site', async () => {
    const { fetch } = site();

    const results = await run(fetch);

    expect(results.map((result) => result.name)).toEqual([
      'Page /',
      'Page /en',
      'Page /verbinden',
      'Page /en/connect',
      'Server Card',
      'AI Catalog',
      'MCP tools',
      'Intro Call slots',
    ]);
    expect(failed(results)).toEqual([]);
    expect(results.at(-2)?.detail).toBe('10 tools');
    expect(results.at(-1)?.detail).toBe('2 free times');
  });

  it('only reads: it never sends a message, books a call or counts against a limit', async () => {
    const { fetch, services } = site();

    await run(fetch);

    expect(services.send).not.toHaveBeenCalled();
    expect(services.book).not.toHaveBeenCalled();
    expect(services.rateLimit).not.toHaveBeenCalled();
  });

  it('names itself in every request', async () => {
    const { fetch, requests } = site();

    await run(fetch);

    expect(new Set(requests.map((r) => r.headers.get('User-Agent')))).toEqual(
      new Set(['inomov-health-check']),
    );
  });

  it('retries a failed check once, so a single dropped request raises no alarm', async () => {
    let calls = 0;
    const { fetch } = site(fakeServices(), (request) =>
      new URL(request.url).pathname === '/en' && calls++ === 0
        ? new Response('', { status: 502 })
        : undefined,
    );
    const sleep = vi.fn(async () => undefined);

    const results = await run(fetch, { sleep });

    expect(failed(results)).toEqual([]);
    expect(sleep).toHaveBeenCalledOnce();
  });

  it('reports a page that keeps failing or lost its content', async () => {
    const { fetch } = site(fakeServices(), (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === '/') return new Response('', { status: 503 });
      if (pathname === '/en') return new Response('<p>empty</p>', { headers: HTML });
      if (pathname === '/verbinden')
        return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      return undefined;
    });

    expect(failed(await run(fetch))).toEqual([
      { name: 'Page /', detail: 'HTTP 503' },
      { name: 'Page /en', detail: 'no <h1> on the page' },
      { name: 'Page /verbinden', detail: 'Content-Type is application/json' },
    ]);
  });

  it('reports discovery documents with the wrong type or content', async () => {
    const { fetch } = site(fakeServices(), (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === '/api/mcp/server-card') {
        return Response.json(
          { name: 'someone/else' },
          {
            headers: { 'Content-Type': 'application/mcp-server-card+json' },
          },
        );
      }
      if (pathname === '/.well-known/ai-catalog.json') return Response.json({ entries: [] });
      return undefined;
    });

    expect(failed(await run(fetch))).toEqual([
      { name: 'Server Card', detail: 'names someone/else' },
      { name: 'AI Catalog', detail: 'Content-Type is application/json' },
    ]);
  });

  it('reports an AI Catalog that no longer points to the Server Card', async () => {
    const { fetch } = site(fakeServices(), (request) =>
      new URL(request.url).pathname === '/.well-known/ai-catalog.json'
        ? Response.json(
            { entries: [{ url: 'https://inomov.online/elsewhere' }] },
            { headers: { 'Content-Type': 'application/ai-catalog+json' } },
          )
        : undefined,
    );

    expect(failed(await run(fetch))).toEqual([
      { name: 'AI Catalog', detail: 'does not point to the Server Card' },
    ]);
  });

  it('reports when Cal.com cannot be reached', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const services = fakeServices({
      listSlots: vi.fn().mockRejectedValue(new Error('Cal.com 500')),
    });
    const { fetch } = site(services);

    const [slots] = failed(await run(fetch));

    expect(slots?.name).toBe('Intro Call slots');
    expect(slots?.detail).toMatch(/^The free times could not be loaded\./);
  });

  it('reports an empty booking window as broken', async () => {
    const { fetch } = site(fakeServices({ listSlots: vi.fn().mockResolvedValue([]) }));

    expect(failed(await run(fetch))).toEqual([
      { name: 'Intro Call slots', detail: 'no free time in the booking window' },
    ]);
  });

  it('reports the MCP endpoint when it does not answer', async () => {
    const { fetch } = site(fakeServices(), (request) =>
      new URL(request.url).pathname === '/api/mcp' ? new Response('', { status: 500 }) : undefined,
    );

    const names = failed(await run(fetch)).map((result) => result.name);

    expect(names).toEqual(['MCP tools', 'Intro Call slots']);
  });

  it('gives up on a check that hangs', async () => {
    const { fetch } = site(fakeServices(), (request) =>
      new URL(request.url).pathname === '/en/connect' ? new Promise(() => undefined) : undefined,
    );

    expect(failed(await run(fetch, { timeoutMs: 20 }))).toEqual([
      { name: 'Page /en/connect', detail: 'no answer within 0.02 s' },
    ]);
  });
});
