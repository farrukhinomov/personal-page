import { afterEach, describe, expect, it, vi } from 'vitest';
import { MCP_TOOLS } from '@/mcp/discovery';
import {
  redisUsageStore,
  USAGE_METRICS,
  usageCounter,
  usageDay,
  type UsageRedis,
  type UsageStore,
} from './usage';

const NOW = new Date('2026-10-30T23:59:59Z');

afterEach(() => {
  vi.restoreAllMocks();
});

function fakeStore(overrides: Partial<UsageStore> = {}): UsageStore {
  return {
    increment: vi.fn<UsageStore['increment']>().mockResolvedValue(undefined),
    read: vi.fn<UsageStore['read']>().mockResolvedValue({}),
    ...overrides,
  };
}

describe('USAGE_METRICS', () => {
  it('covers every outcome, every limit and every MCP tool', () => {
    expect(USAGE_METRICS).toEqual(
      expect.arrayContaining(['message:form', 'confirmation:failed', 'limited:mcpBookingTotal']),
    );
    for (const tool of MCP_TOOLS) expect(USAGE_METRICS).toContain(`mcp:${tool}`);
    expect(new Set(USAGE_METRICS).size).toBe(USAGE_METRICS.length);
  });
});

describe('usageDay', () => {
  it('names the UTC day', () => {
    expect(usageDay(NOW)).toBe('2026-10-30');
  });
});

describe('usageCounter', () => {
  it('counts the event on the current UTC day', async () => {
    const store = fakeStore();

    await usageCounter(() => store, { now: () => NOW })('message:form');

    expect(store.increment).toHaveBeenCalledWith('2026-10-30', 'message:form');
  });

  it('logs a Redis error and lets the request go on', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = fakeStore({ increment: vi.fn().mockRejectedValue(new Error('down')) });

    await expect(usageCounter(() => store)('booking:form')).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      'Counting booking:form failed; the request goes on.',
      expect.any(Error),
    );
  });

  it('logs a missing configuration instead of failing the request', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const count = usageCounter(() => {
      throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN must be set');
    });

    await expect(count('message:form')).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
  });

  it('gives up on a slow Redis', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = fakeStore({ increment: () => new Promise(() => undefined) });

    await usageCounter(() => store, { timeoutMs: 10 })('mcp:get_profile');

    expect(error.mock.calls[0]?.[1]).toEqual(new Error('Redis did not answer in time.'));
  });
});

describe('redisUsageStore', () => {
  function fakeRedis(stored: Record<string, unknown> | null = null) {
    return {
      hincrby: vi.fn<UsageRedis['hincrby']>().mockResolvedValue(1),
      expire: vi.fn<UsageRedis['expire']>().mockResolvedValue(1),
      hgetall: vi.fn<UsageRedis['hgetall']>().mockResolvedValue(stored),
    };
  }

  it('keeps one hash per day that expires after 90 days', async () => {
    const redis = fakeRedis();

    await redisUsageStore(redis).increment('2026-10-30', 'mcp:get_profile');

    expect(redis.hincrby).toHaveBeenCalledWith('usage:2026-10-30', 'mcp:get_profile', 1);
    expect(redis.expire).toHaveBeenCalledWith('usage:2026-10-30', 90 * 24 * 60 * 60);
  });

  it('reads a day as numbers and leaves out fields it does not know', async () => {
    const redis = fakeRedis({ 'message:form': 2, 'booking:form': '1', stray: 5 });

    expect(await redisUsageStore(redis).read('2026-10-30')).toEqual({
      'message:form': 2,
      'booking:form': 1,
    });
    expect(redis.hgetall).toHaveBeenCalledWith('usage:2026-10-30');
  });

  it('reads a day without counts as empty', async () => {
    expect(await redisUsageStore(fakeRedis(null)).read('2026-10-30')).toEqual({});
  });
});
