/**
 * Cloudflare Turnstile for the Contact page forms. The script is loaded once, on the first
 * interaction with any form, so a plain page view sends nothing to Cloudflare. Each form renders
 * its own widget and gets one token per submit.
 */

interface Turnstile {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
/** How long a submit waits for the bot check before giving up. */
const TOKEN_TIMEOUT_MS = 15_000;

let script: Promise<Turnstile> | undefined;

function loadScript(): Promise<Turnstile> {
  script ??= new Promise<Turnstile>((resolve, reject) => {
    window.onTurnstileLoad = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing'));
    const element = document.createElement('script');
    element.src = SCRIPT_SRC;
    element.async = true;
    element.onerror = () => reject(new Error('Turnstile failed to load'));
    document.head.append(element);
  });
  return script;
}

export interface TurnstileWidget {
  /** Loads the script and renders the widget; safe to call repeatedly. */
  load(): void;
  /** The current token, waiting for the check to finish if needed. */
  token(): Promise<string>;
  /** Discards the used token and starts a new check. */
  reset(): void;
}

export function turnstileWidget(
  container: HTMLElement | null,
  options: { siteKey: string; locale: string },
): TurnstileWidget {
  let widgetId: string | undefined;
  let rendering: Promise<void> | undefined;
  let current: string | undefined;
  let waiting: ((token: string) => void)[] = [];

  const load = () => {
    rendering ??= loadScript().then((turnstile) => {
      if (!container) return;
      widgetId = turnstile.render(container, {
        sitekey: options.siteKey,
        language: options.locale,
        theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
        appearance: 'interaction-only',
        callback: (token: string) => {
          current = token;
          waiting.forEach((resolve) => resolve(token));
          waiting = [];
        },
        'expired-callback': () => (current = undefined),
      });
    });
  };

  const token = () => {
    load();
    if (current) return Promise.resolve(current);
    return new Promise<string>((resolve, reject) => {
      waiting.push(resolve);
      setTimeout(() => reject(new Error('Turnstile timed out')), TOKEN_TIMEOUT_MS);
    });
  };

  // A token is valid for one request only.
  const reset = () => {
    current = undefined;
    if (widgetId && window.turnstile) window.turnstile.reset(widgetId);
  };

  return { load, token, reset };
}
