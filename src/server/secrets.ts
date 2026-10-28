import { getSecret } from 'astro:env/server';

export type ApiSecret = 'TURNSTILE_SECRET_KEY' | 'RESEND_API_KEY' | 'CALCOM_API_KEY';

/** A server secret the route cannot work without; a missing one fails loudly with a 500. */
export function requiredSecret(name: ApiSecret): string {
  const value = getSecret(name);
  if (!value) throw new Error(`${name} must be set (see .env.example).`);
  return value;
}
