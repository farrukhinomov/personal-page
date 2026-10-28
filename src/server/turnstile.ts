const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Asks Cloudflare whether a Turnstile token is valid. Any failure, including Cloudflare being
 * unreachable, counts as not verified: without the check the form would be open to bots.
 */
export async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetcher(SITEVERIFY_URL, {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    if (!response.ok) throw new Error(`Turnstile siteverify answered ${response.status}`);
    const result: unknown = await response.json();
    return typeof result === 'object' && result !== null && 'success' in result
      ? result.success === true
      : false;
  } catch (error) {
    console.error('Turnstile verification failed.', error);
    return false;
  }
}
