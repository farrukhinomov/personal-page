import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getSecret } from 'astro:env/server';
import {
  checkRateLimit,
  DAILY_LIMITS,
  FAIL_CLOSED,
  type Limiter,
  type RateLimitedAction,
  type RateLimitResult,
} from './rate-limit';

/** Give up on Redis after this long and let the request through (see checkRateLimit). */
const REDIS_TIMEOUT_MS = 1000;

interface Connection {
  limiters: Record<RateLimitedAction, Limiter>;
  /** The Redis token doubles as the HMAC secret for client keys: no extra secret to manage. */
  hashSecret: string;
}

let connection: Connection | undefined;

/**
 * Counts one attempt at `action` from this IP. The Upstash for Redis integration in the Vercel
 * Marketplace sets both variables; locally they come from `.env` (see `.env.example`).
 * Missing variables throw, so the route answers 500: unlike a Redis outage, a configuration
 * error does not pass by itself and must not switch the limits off unnoticed.
 */
export function rateLimit(action: RateLimitedAction, ip: string): Promise<RateLimitResult> {
  connection ??= connect();
  return checkRateLimit(connection.limiters[action], ip, connection.hashSecret, {
    failClosed: FAIL_CLOSED.has(action),
  });
}

function connect(): Connection {
  const url = getSecret('KV_REST_API_URL');
  const token = getSecret('KV_REST_API_TOKEN');
  if (!url || !token) {
    throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN must be set for rate limiting.');
  }
  const redis = new Redis({ url, token });
  const create = (action: RateLimitedAction): Limiter =>
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(DAILY_LIMITS[action], '1 d'),
      prefix: `ratelimit:${action}`,
      timeout: REDIS_TIMEOUT_MS,
    });
  const actions = Object.keys(DAILY_LIMITS) as RateLimitedAction[];
  return {
    limiters: Object.fromEntries(actions.map((action) => [action, create(action)])) as Record<
      RateLimitedAction,
      Limiter
    >,
    hashSecret: token,
  };
}
