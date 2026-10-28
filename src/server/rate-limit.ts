/**
 * Per-IP daily limits for everything that reaches Farrukh's calendar or inbox (issue #13).
 * The counters live in Upstash Redis; see `upstash.ts` for the connection.
 */

/** How many times one IP may do each action per day. */
export const DAILY_LIMITS = {
  booking: 3,
  message: 5,
  mcpMessage: 3,
} as const;

export type RateLimitedAction = keyof typeof DAILY_LIMITS;

/** The part of an Upstash `Ratelimit` this module uses, so tests can pass a fake. */
export interface Limiter {
  limit(identifier: string): Promise<{ success: boolean; remaining: number; reset: number }>;
}

export type RateLimitResult =
  { allowed: true; remaining: number } | { allowed: false; retryAfterSeconds: number };

/** IPv6 groups in a /64 network prefix, the block one household or server usually gets. */
const IPV6_PREFIX_GROUPS = 4;

/**
 * The address a limit counts against. IPv6 clients usually control a whole /64 network, so a
 * limit per full address could be dodged by switching addresses; IPv4 stays as it is.
 */
export function clientKey(ip: string): string {
  const address = ip.trim().toLowerCase().split('%')[0] ?? '';
  if (!address.includes(':')) return address;
  const mappedIpv4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  if (mappedIpv4?.[1]) return mappedIpv4[1];

  const [head = '', tail] = address.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const zeros = Array<string>(Math.max(0, 8 - headGroups.length - tailGroups.length)).fill('0');
  const groups = tail === undefined ? headGroups : [...headGroups, ...zeros, ...tailGroups];
  const prefix = groups
    .slice(0, IPV6_PREFIX_GROUPS)
    .map((group) => parseInt(group || '0', 16).toString(16));
  return `${prefix.join(':')}::/64`;
}

/**
 * Keys the counter by an HMAC of the client address, so Redis never holds an IP. Without the
 * secret the hashes cannot be reversed by trying every IPv4 address. They are still
 * pseudonymous personal data, so the keys expire with the one-day window.
 */
export async function hashClient(ip: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(clientKey(ip)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Counts one attempt for this client. When Redis fails or times out, the request is let through
 * and the error logged: an outage must not lock every Visitor out, and Turnstile and Cal.com
 * approval remain.
 */
export async function checkRateLimit(
  limiter: Limiter,
  ip: string,
  secret: string,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  try {
    const { success, remaining, reset } = await limiter.limit(await hashClient(ip, secret));
    if (success) return { allowed: true, remaining };
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - now) / 1000)) };
  } catch (error) {
    console.error('Rate limit check failed; letting the request through.', error);
    return { allowed: true, remaining: 0 };
  }
}

/** The 429 answer every limited endpoint returns, in the shared error shape. */
export function rateLimitedResponse(retryAfterSeconds: number): Response {
  return Response.json(
    {
      ok: false,
      error: { code: 'rate_limited', message: 'Too many requests. Try again tomorrow.' },
    },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}
