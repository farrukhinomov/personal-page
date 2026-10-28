import { describe, expect, it, vi } from 'vitest';
import { MAX_BODY_BYTES, readJson } from './request';

const secrets = vi.hoisted(() => new Map<string, string>());

vi.mock('astro:env/server', () => ({
  getSecret: (name: string) => secrets.get(name),
}));

function post(body: string, headers: Record<string, string> = {}) {
  return new Request('https://inomov.online/api/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

async function codeOf(result: Awaited<ReturnType<typeof readJson>>) {
  if (result.ok) throw new Error('expected a refusal');
  return {
    status: result.response.status,
    code: ((await result.response.json()) as { error: { code: string } }).error.code,
  };
}

describe('readJson', () => {
  it('parses a JSON body', async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ ok: true, body: { a: 1 } });
  });

  it('refuses anything that is not JSON, so cross-site forms need a preflight', async () => {
    const request = post('a=1', { 'Content-Type': 'application/x-www-form-urlencoded' });

    expect(await codeOf(await readJson(request))).toEqual({
      status: 415,
      code: 'unsupported_media_type',
    });
  });

  it('refuses a body that declares or turns out to be too large', async () => {
    const declared = post('{}', { 'Content-Length': String(MAX_BODY_BYTES + 1) });
    const actual = post(JSON.stringify({ text: 'x'.repeat(MAX_BODY_BYTES) }));

    expect(await codeOf(await readJson(declared))).toEqual({
      status: 413,
      code: 'payload_too_large',
    });
    expect(await codeOf(await readJson(actual))).toEqual({
      status: 413,
      code: 'payload_too_large',
    });
  });

  it('refuses broken JSON', async () => {
    expect(await codeOf(await readJson(post('{"a":')))).toEqual({
      status: 400,
      code: 'invalid_json',
    });
  });
});

describe('requiredSecret', () => {
  it('returns a set secret and names a missing one', async () => {
    const { requiredSecret } = await import('./secrets');
    secrets.set('CALCOM_API_KEY', 'cal_test');

    expect(requiredSecret('CALCOM_API_KEY')).toBe('cal_test');
    expect(() => requiredSecret('RESEND_API_KEY')).toThrow('RESEND_API_KEY must be set');
  });
});
