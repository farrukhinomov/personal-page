/**
 * Wraps `load` so its result is reused for `ms` milliseconds within one function instance.
 * Concurrent calls share one load; a failed load is not kept, so the next call tries again.
 */
export function cacheFor<T>(
  ms: number,
  load: () => Promise<T>,
  now: () => number = Date.now,
): () => Promise<T> {
  let cached: { value: Promise<T>; until: number } | undefined;
  return () => {
    if (cached && now() < cached.until) return cached.value;
    const value = load();
    const entry = { value, until: now() + ms };
    cached = entry;
    value.catch(() => {
      if (cached === entry) cached = undefined;
    });
    return value;
  };
}
