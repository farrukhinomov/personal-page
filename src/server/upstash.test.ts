import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashClient } from './rate-limit';

const secrets = vi.hoisted(() => new Map<string, string>());

const limit = vi.hoisted(() => vi.fn());

vi.mock('astro:env/server', () => ({
  getSecret: (name: string) => secrets.get(name),
}));

vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow = (tokens: number, window: string) => ({ tokens, window });
    constructor(readonly options: { prefix: string; limiter: unknown }) {}
    limit = (identifier: string) => limit(this.options, identifier);
  }
  return { Ratelimit };
});

beforeEach(() => {
  secrets.clear();
  vi.resetModules();
});

describe('rateLimit', () => {
  it('fails with a clear message when the Upstash variables are missing', async () => {
    const { rateLimit } = await import('./upstash');

    expect(() => rateLimit('message', '203.0.113.7')).toThrow(
      'KV_REST_API_URL and KV_REST_API_TOKEN',
    );
  });

  it('counts each action in its own window, keyed by the HMAC of the client', async () => {
    secrets.set('KV_REST_API_URL', 'https://example.upstash.io');
    secrets.set('KV_REST_API_TOKEN', 'test-token');
    limit.mockResolvedValue({ success: true, remaining: 2, reset: 0 });
    const { rateLimit } = await import('./upstash');

    expect(await rateLimit('booking', '203.0.113.7')).toEqual({ allowed: true, remaining: 2 });
    await rateLimit('mcpMessage', '203.0.113.7');

    const key = await hashClient('203.0.113.7', 'test-token');
    expect(limit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        prefix: 'ratelimit:booking',
        limiter: { tokens: 3, window: '1 d' },
        timeout: 1000,
      }),
      key,
    );
    expect(limit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prefix: 'ratelimit:mcpMessage',
        limiter: { tokens: 3, window: '1 d' },
        timeout: 1000,
      }),
      key,
    );
  });
});
