import { MCP_TOOLS } from '@/mcp/discovery';
import type { ToolName } from '@/mcp/tool-info';
import { DAILY_LIMITS, type RateLimitedAction } from './rate-limit';

/**
 * Daily usage counters for the weekly summary (issue #75). They hold numbers only: no IP, no
 * content, no names. Each day is one Redis hash that expires after `USAGE_RETENTION_DAYS`.
 */

export const USAGE_RETENTION_DAYS = 90;

/** Give up on Redis after this long; counting must never hold up a request. */
const COUNT_TIMEOUT_MS = 1000;

const OUTCOMES = [
  'message:form',
  'message:assistant',
  'message:failed',
  'booking:form',
  'booking:assistant',
  'booking:failed',
  'confirmation:sent',
  'confirmation:failed',
] as const;

export type UsageMetric =
  (typeof OUTCOMES)[number] | `limited:${RateLimitedAction}` | `mcp:${ToolName}`;

/** Every metric there is, in the order the summary lists them. */
export const USAGE_METRICS: readonly UsageMetric[] = [
  ...OUTCOMES,
  ...(Object.keys(DAILY_LIMITS) as RateLimitedAction[]).map(
    (action) => `limited:${action}` as const,
  ),
  ...MCP_TOOLS.map((tool) => `mcp:${tool}` as const),
];

/** A day's counts, keyed by metric. */
export type DayUsage = Partial<Record<UsageMetric, number>>;

export interface UsageStore {
  increment(day: string, metric: UsageMetric): Promise<void>;
  read(day: string): Promise<DayUsage>;
}

export type CountUsage = (metric: UsageMetric) => Promise<void>;

/** The UTC day a count belongs to, e.g. "2026-10-30". */
export function usageDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Counts one event. A missing configuration, a Redis error or a slow Redis is logged and the
 * request goes on: the counters are for the Owner's overview, not for running the site.
 */
export function usageCounter(
  store: () => UsageStore,
  { now = () => new Date(), timeoutMs = COUNT_TIMEOUT_MS } = {},
): CountUsage {
  return async (metric) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Redis did not answer in time.')), timeoutMs);
      });
      await Promise.race([store().increment(usageDay(now()), metric), timeout]);
    } catch (error) {
      console.error(`Counting ${metric} failed; the request goes on.`, error);
    } finally {
      clearTimeout(timer);
    }
  };
}

/** The Redis commands the store needs, so tests can pass a fake. */
export interface UsageRedis {
  hincrby(key: string, field: string, increment: number): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
  hgetall(key: string): Promise<Record<string, unknown> | null>;
}

const known = new Set<string>(USAGE_METRICS);

export function redisUsageStore(redis: UsageRedis): UsageStore {
  const key = (day: string) => `usage:${day}`;
  return {
    async increment(day, metric) {
      await redis.hincrby(key(day), metric, 1);
      await redis.expire(key(day), USAGE_RETENTION_DAYS * 24 * 60 * 60);
    },
    async read(day) {
      const stored = (await redis.hgetall(key(day))) ?? {};
      return Object.fromEntries(
        Object.entries(stored)
          .filter(([metric]) => known.has(metric))
          .map(([metric, count]) => [metric, Number(count) || 0]),
      ) as DayUsage;
    },
  };
}
