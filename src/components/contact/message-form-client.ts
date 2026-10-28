/**
 * The Message form on the Contact page: inline validation, the Turnstile bot check (loaded on
 * first interaction, so a plain page view sends nothing to Cloudflare) and sending to /api/message.
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

type Messages = Record<string, Record<string, string>>;
type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const ENDPOINT = '/api/message';
const TURNSTILE_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
/** How long a submit waits for the bot check before giving up. */
const TOKEN_TIMEOUT_MS = 15_000;
const VALIDATED_FIELDS = ['name', 'email', 'company', 'topic', 'message', 'consent'] as const;

const form = document.querySelector<HTMLFormElement>('[data-message-form]');
if (form) setUp(form);

function setUp(form: HTMLFormElement): void {
  const errors = JSON.parse(form.dataset.errors ?? '{}') as Messages;
  const status = JSON.parse(form.dataset.status ?? '{}') as Record<string, string>;
  const statusText = form.querySelector<HTMLElement>('[data-status-text]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const sent = form.parentElement?.querySelector<HTMLElement>('[data-sent]');
  const turnstile = createTurnstile(form);
  let submitted = false;

  const control = (name: string) => form.elements.namedItem(name) as FieldControl | null;

  const validate = (name: string): boolean => {
    const field = control(name);
    if (!field) return true;
    const error = errorFor(field, errors[name] ?? {});
    field.setAttribute('aria-invalid', String(Boolean(error)));
    const output = document.getElementById(`message-${name}-error`);
    if (output) output.textContent = error;
    return !error;
  };

  const setStatus = (text: string, tone: 'info' | 'error' = 'info') => {
    if (!statusText) return;
    statusText.textContent = text;
    statusText.dataset.tone = tone;
  };

  for (const name of VALIDATED_FIELDS) {
    const field = control(name);
    field?.addEventListener('blur', () => validate(name));
    field?.addEventListener(name === 'consent' || name === 'topic' ? 'change' : 'input', () => {
      if (submitted || field.getAttribute('aria-invalid') === 'true') validate(name);
    });
  }

  const message = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
  const count = form.querySelector<HTMLElement>('[data-count]');
  message?.addEventListener('input', () => {
    if (count) count.textContent = `${message.value.length} / ${message.maxLength}`;
  });

  form.addEventListener('focusin', () => turnstile.load(), { once: true });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit?.getAttribute('aria-busy') === 'true') return;
    submitted = true;

    const invalid = VALIDATED_FIELDS.filter((name) => !validate(name));
    if (invalid.length > 0) {
      setStatus(status.invalid ?? '', 'error');
      control(invalid[0] ?? '')?.focus();
      return;
    }

    submit?.setAttribute('aria-busy', 'true');
    try {
      setStatus(status.verifying ?? '');
      const token = await turnstile.token();
      setStatus(status.sending ?? '');
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formValues(form), turnstileToken: token }),
      });
      if (response.ok) {
        showSent(form, sent);
        return;
      }
      const code = await errorCode(response);
      if (code === 'invalid_input') {
        const fields = await response
          .clone()
          .json()
          .then((body: { error?: { fields?: string[] } }) => body.error?.fields ?? [])
          .catch(() => []);
        fields.forEach((name: string) => validate(name));
      }
      setStatus(status[code] ?? status.failed ?? '', 'error');
      turnstile.reset();
    } catch {
      setStatus(status.failed ?? '', 'error');
      turnstile.reset();
    } finally {
      submit?.removeAttribute('aria-busy');
    }
  });
}

/** The first problem with a field, in the page's language, or an empty string. */
function errorFor(field: FieldControl, messages: Record<string, string>): string {
  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    return field.checked ? '' : (messages.missing ?? '');
  }
  const value = field.value.trim();
  if (!value) return field.required ? (messages.missing ?? '') : '';
  if ('minLength' in field && field.minLength > 0 && value.length < field.minLength) {
    return messages.short ?? '';
  }
  if ('maxLength' in field && field.maxLength > 0 && value.length > field.maxLength) {
    return messages.long ?? '';
  }
  if (field.type === 'email' && field.validity.typeMismatch) return messages.invalid ?? '';
  return '';
}

function formValues(form: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(form);
  const text = (name: string) => String(data.get(name) ?? '').trim();
  return {
    name: text('name'),
    email: text('email'),
    company: text('company'),
    topic: text('topic'),
    message: text('message'),
    consent: data.get('consent') === 'on',
    website: String(data.get('website') ?? ''),
    locale: form.dataset.locale,
  };
}

async function errorCode(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as { error?: { code?: string } };
    return body.error?.code ?? 'failed';
  } catch {
    return 'failed';
  }
}

function showSent(form: HTMLFormElement, sent: HTMLElement | null | undefined): void {
  form.hidden = true;
  if (!sent) return;
  sent.hidden = false;
  sent.focus();
}

/** Loads Turnstile once and hands out one token per submit. */
function createTurnstile(form: HTMLFormElement) {
  const container = form.querySelector<HTMLElement>('[data-turnstile]');
  let widgetId: string | undefined;
  let current: string | undefined;
  let waiting: ((token: string) => void)[] = [];

  const ready = new Promise<Turnstile>((resolve, reject) => {
    window.onTurnstileLoad = () => (window.turnstile ? resolve(window.turnstile) : reject());
  });

  const load = () => {
    if (document.querySelector(`script[src="${TURNSTILE_SRC}"]`)) return;
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    document.head.append(script);
    void ready.then((turnstile) => {
      if (!container) return;
      widgetId = turnstile.render(container, {
        sitekey: form.dataset.siteKey,
        language: form.dataset.locale,
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

// Makes this file a module, which the `declare global` above requires.
export {};
