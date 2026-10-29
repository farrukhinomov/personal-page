import { describe, expect, it, vi } from 'vitest';
import { cacheFor } from './cache';

describe('cacheFor', () => {
  it('reuses a result until it expires, and shares a load already running', async () => {
    let now = 0;
    const load = vi.fn().mockResolvedValue(['slot']);
    const cached = cacheFor(60_000, load, () => now);

    await Promise.all([cached(), cached()]);
    now = 59_999;
    await cached();
    expect(load).toHaveBeenCalledOnce();

    now = 60_000;
    await cached();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps no failure, so the next call loads again', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(['slot']);
    const cached = cacheFor(60_000, load, () => 0);

    await expect(cached()).rejects.toThrow('down');
    await expect(cached()).resolves.toEqual(['slot']);
  });
});
