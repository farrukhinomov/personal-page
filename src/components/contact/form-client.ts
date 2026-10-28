/**
 * Shared behaviour of the Contact page forms (Message and Intro Call booking): inline
 * validation in the page's language, the Turnstile check and sending JSON to an API route.
 * Copy comes from the form's data attributes, so no text lives in the script.
 */
import { turnstileWidget } from './turnstile-client';

type Messages = Record<string, Record<string, string>>;
type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export interface ContactFormOptions {
  /** Prefix of the field ids, e.g. "message" for `message-name-error`. */
  prefix: string;
  /** Fields validated in the browser, in the order they appear. */
  fields: readonly string[];
  endpoint: string;
  /** The JSON body without locale, honeypot and Turnstile token, which are added here. */
  values(data: FormData): Record<string, unknown>;
  /** Runs before the confirmation panel is shown, e.g. to fill in details. */
  onSuccess?(): void;
  /** Runs after a refused submit with the server's error code. */
  onError?(code: string): void;
}

export interface ContactForm {
  validate(name: string): boolean;
}

export function setUpContactForm(form: HTMLFormElement, options: ContactFormOptions): ContactForm {
  const errors = JSON.parse(form.dataset.errors ?? '{}') as Messages;
  const status = JSON.parse(form.dataset.status ?? '{}') as Record<string, string>;
  const statusText = form.querySelector<HTMLElement>('[data-status-text]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const sent = form.parentElement?.querySelector<HTMLElement>('[data-sent]');
  const turnstile = turnstileWidget(form.querySelector('[data-turnstile]'), {
    siteKey: form.dataset.siteKey ?? '',
    locale: form.dataset.locale ?? 'de',
  });
  let submitted = false;

  const control = (name: string) => form.elements.namedItem(name) as FieldControl | null;

  const validate = (name: string): boolean => {
    const field = control(name);
    if (!field) return true;
    const error = errorFor(field, errors[name] ?? {});
    field.setAttribute('aria-invalid', String(Boolean(error)));
    const output = document.getElementById(`${options.prefix}-${name}-error`);
    if (output) output.textContent = error;
    return !error;
  };

  const setStatus = (text: string, tone: 'info' | 'error' = 'info') => {
    if (!statusText) return;
    statusText.textContent = text;
    statusText.dataset.tone = tone;
  };

  for (const name of options.fields) {
    const field = control(name);
    if (!field || field.type === 'hidden') continue;
    field.addEventListener('blur', () => validate(name));
    const live = field.type === 'checkbox' || field instanceof HTMLSelectElement;
    field.addEventListener(live ? 'change' : 'input', () => {
      if (submitted || field.getAttribute('aria-invalid') === 'true') validate(name);
    });
  }

  form.addEventListener('focusin', () => turnstile.load(), { once: true });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit?.getAttribute('aria-busy') === 'true') return;
    submitted = true;

    const invalid = options.fields.filter((name) => !validate(name));
    if (invalid.length > 0) {
      setStatus(status.invalid ?? '', 'error');
      focusField(form, control(invalid[0] ?? ''));
      return;
    }

    submit?.setAttribute('aria-busy', 'true');
    try {
      setStatus(status.verifying ?? '');
      const token = await turnstile.token();
      setStatus(status.sending ?? '');
      const data = new FormData(form);
      const response = await fetch(options.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...options.values(data),
          website: String(data.get('website') ?? ''),
          locale: form.dataset.locale,
          turnstileToken: token,
        }),
      });
      if (response.ok) {
        options.onSuccess?.();
        showSent(form, sent);
        return;
      }
      const error = await errorOf(response);
      error.fields?.forEach((name) => validate(name));
      setStatus(status[error.code] ?? status.failed ?? '', 'error');
      turnstile.reset();
      options.onError?.(error.code);
    } catch {
      setStatus(status.failed ?? '', 'error');
      turnstile.reset();
    } finally {
      submit?.removeAttribute('aria-busy');
    }
  });

  return { validate };
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

/** Hidden fields (like a chosen Slot) name the element to focus instead, via `data-focus`. */
function focusField(form: HTMLFormElement, field: FieldControl | null): void {
  if (!field) return;
  if (field.type !== 'hidden') {
    field.focus();
    return;
  }
  const selector = field.dataset.focus;
  if (selector) form.querySelector<HTMLElement>(selector)?.focus();
}

async function errorOf(response: Response): Promise<{ code: string; fields?: string[] }> {
  try {
    const body = (await response.json()) as { error?: { code?: string; fields?: string[] } };
    return {
      code: body.error?.code ?? 'failed',
      ...(body.error?.fields ? { fields: body.error.fields } : {}),
    };
  } catch {
    return { code: 'failed' };
  }
}

function showSent(form: HTMLFormElement, sent: HTMLElement | null | undefined): void {
  form.hidden = true;
  if (!sent) return;
  sent.hidden = false;
  sent.focus();
}
