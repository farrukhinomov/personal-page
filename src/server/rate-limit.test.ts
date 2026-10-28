import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkRateLimit,
  clientKey,
  DAILY_LIMITS,
  hashClient,
  rateLimitedResponse,
  type Limiter,
} from './rate-limit';

const NOW = Date.UTC(2026, 9, 28, 12);
const SECRET = 'test-secret';

function limiterReturning(result: Awaited<ReturnType<Limiter['limit']>>) {
  return { limit: vi.fn<Limiter['limit']>().mockResolvedValue(result) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DAILY_LIMITS', () => {
  it('matches the agreed limits', () => {
    expect(DAILY_LIMITS).toEqual({ booking: 3, message: 10, mcpMessage: 3, confirmation: 3 });
  });
});

describe('clientKey', () => {
  it('keeps an IPv4 address as it is', () => {
    expect(clientKey('203.0.113.7')).toBe('203.0.113.7');
  });

  it('unwraps an IPv4-mapped IPv6 address', () => {
    expect(clientKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
  });

  it('groups every IPv6 address of one /64 network', () => {
    expect(clientKey('2001:db8:aa:1:1234:5678:9abc:def0')).toBe('2001:db8:aa:1::/64');
    expect(clientKey('2001:DB8:AA:1::2')).toBe('2001:db8:aa:1::/64');
    expect(clientKey('2001:0db8:00aa:0001::fe%eth0')).toBe('2001:db8:aa:1::/64');
  });

  it('expands a shortened prefix', () => {
    expect(clientKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(clientKey('::1')).toBe('0:0:0:0::/64');
  });

  it('keeps different /64 networks apart', () => {
    expect(clientKey('2001:db8:aa:1::1')).not.toBe(clientKey('2001:db8:aa:2::1'));
  });
});

describe('hashClient', () => {
  it('returns an HMAC-SHA-256 hex digest, never the IP itself', async () => {
    const hash = await hashClient('203.0.113.7', SECRET);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('203.0.113.7');
  });

  it('is stable for one /64 network and differs between networks', async () => {
    expect(await hashClient('2001:db8::1', SECRET)).toBe(await hashClient('2001:db8::2', SECRET));
    expect(await hashClient('2001:db8::1', SECRET)).not.toBe(
      await hashClient('2001:db8:0:1::1', SECRET),
    );
  });

  it('depends on the secret, so the hash cannot be rebuilt from the IP alone', async () => {
    expect(await hashClient('203.0.113.7', SECRET)).not.toBe(
      await hashClient('203.0.113.7', 'other-secret'),
    );
  });
});

describe('checkRateLimit', () => {
  it('counts the attempt under the hashed client key', async () => {
    const limiter = limiterReturning({ success: true, remaining: 2, reset: NOW + 1000 });

    const result = await checkRateLimit(limiter, '203.0.113.7', SECRET, NOW);

    expect(result).toEqual({ allowed: true, remaining: 2 });
    expect(limiter.limit).toHaveBeenCalledWith(await hashClient('203.0.113.7', SECRET));
  });

  it('rejects with the seconds until the window frees up, rounded up', async () => {
    const limiter = limiterReturning({ success: false, remaining: 0, reset: NOW + 90_500 });

    expect(await checkRateLimit(limiter, '203.0.113.7', SECRET, NOW)).toEqual({
      allowed: false,
      retryAfterSeconds: 91,
    });
  });

  it('never asks to retry in less than a second', async () => {
    const limiter = limiterReturning({ success: false, remaining: 0, reset: NOW - 5 });

    expect(await checkRateLimit(limiter, '203.0.113.7', SECRET, NOW)).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    });
  });

  it('lets the request through and logs when Redis fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const limiter = { limit: vi.fn<Limiter['limit']>().mockRejectedValue(new Error('down')) };

    expect(await checkRateLimit(limiter, '203.0.113.7', SECRET, NOW)).toEqual({
      allowed: true,
      remaining: 0,
    });
    expect(error).toHaveBeenCalledOnce();
  });
});

describe('rateLimitedResponse', () => {
  it('answers 429 with Retry-After and the shared error shape', async () => {
    const response = rateLimitedResponse(120);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('120');
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: 'rate_limited', message: 'Too many requests. Try again tomorrow.' },
    });
  });
});
