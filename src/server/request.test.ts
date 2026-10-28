import { describe, expect, it, vi } from 'vitest';
import { MAX_BODY_BYTES, MAX_UPLOAD_BYTES, readJson, readJsonWithFiles } from './request';

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

async function codeOf(result: { ok: true } | { ok: false; response: Response }) {
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

describe('readJsonWithFiles', () => {
  const SITE = 'https://inomov.online';

  function upload(parts: FormData, headers: Record<string, string> = {}) {
    return new Request(`${SITE}/api/message`, {
      method: 'POST',
      headers: { Origin: SITE, ...headers },
      body: parts,
    });
  }

  function parts(json: string | undefined, files: File[] = []) {
    const form = new FormData();
    if (json !== undefined) form.append('json', json);
    for (const file of files) form.append('attachments', file);
    return form;
  }

  it('reads plain JSON without files', async () => {
    expect(await readJsonWithFiles(post('{"a":1}'))).toEqual({
      ok: true,
      body: { a: 1 },
      files: [],
    });
  });

  it('reads the JSON part and the files of a multipart upload', async () => {
    const file = new File(['%PDF-1.7'], 'cv.pdf');

    const result = await readJsonWithFiles(upload(parts('{"a":1}', [file])));

    if (!result.ok) throw new Error('expected a body');
    expect(result.body).toEqual({ a: 1 });
    expect(result.files.map((part) => part.name)).toEqual(['cv.pdf']);
    expect(await result.files[0]?.text()).toBe('%PDF-1.7');
  });

  it('refuses an upload from another site, which needs no preflight', async () => {
    const foreign = upload(parts('{}'), { Origin: 'https://evil.example' });
    const anonymous = new Request(`${SITE}/api/message`, { method: 'POST', body: parts('{}') });

    expect(await codeOf(await readJsonWithFiles(foreign))).toEqual({
      status: 403,
      code: 'forbidden_origin',
    });
    expect(await codeOf(await readJsonWithFiles(anonymous))).toEqual({
      status: 403,
      code: 'forbidden_origin',
    });
  });

  it('refuses an upload that declares or turns out to be too large', async () => {
    const bigUpload = () =>
      upload(parts('{}', [new File([new Uint8Array(MAX_UPLOAD_BYTES)], 'big.pdf')]));
    const big = bigUpload();
    // Streamed, so no length is declared and the body is measured while it is read.
    const source = bigUpload();
    const streamed = new Request(`${SITE}/api/message`, {
      method: 'POST',
      headers: { Origin: SITE, 'Content-Type': source.headers.get('content-type') ?? '' },
      body: source.body,
      duplex: 'half',
    } as RequestInit);

    expect(streamed.headers.get('content-length')).toBeNull();
    for (const request of [big, streamed]) {
      expect(await codeOf(await readJsonWithFiles(request))).toEqual({
        status: 413,
        code: 'payload_too_large',
      });
    }
  });

  it('refuses an upload without valid JSON', async () => {
    for (const json of [undefined, '{"a":']) {
      expect(await codeOf(await readJsonWithFiles(upload(parts(json))))).toEqual({
        status: 400,
        code: 'invalid_json',
      });
    }
  });
});
