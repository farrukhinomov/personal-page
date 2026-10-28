import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from './turnstile';

function fetchReturning(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('verifyTurnstile', () => {
  it('sends secret, token and IP to Cloudflare and trusts its verdict', async () => {
    const fetcher = fetchReturning(Response.json({ success: true }));

    expect(await verifyTurnstile('secret', 'token', '203.0.113.7', fetcher)).toBe(true);

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(init?.method).toBe('POST');
    expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({
      secret: 'secret',
      response: 'token',
      remoteip: '203.0.113.7',
    });
  });

  it('rejects a token Cloudflare does not accept', async () => {
    const fetcher = fetchReturning(Response.json({ success: false }));

    expect(await verifyTurnstile('secret', 'token', '203.0.113.7', fetcher)).toBe(false);
  });

  it.each([
    ['an error status', () => fetchReturning(new Response('down', { status: 500 }))],
    ['an unexpected body', () => fetchReturning(Response.json('ok'))],
    ['a network error', () => vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'))],
  ])('fails closed on %s', async (_case, makeFetcher) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await verifyTurnstile('secret', 'token', '203.0.113.7', makeFetcher())).toBe(false);
  });
});
