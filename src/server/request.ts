import { ATTACHMENT_LIMITS } from './attachments';
import { errorResponse } from './responses';

/** Far above any valid form submission; larger bodies are refused before parsing. */
export const MAX_BODY_BYTES = 16 * 1024;

export type JsonBody = { ok: true; body: unknown } | { ok: false; response: Response };

/**
 * Reads a JSON request body for an API route. JSON only: a cross-site form cannot send it
 * without a CORS preflight, which these routes never allow.
 */
export async function readJson(request: Request): Promise<JsonBody> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return refuse(415, 'unsupported_media_type', 'Send the request as JSON.');
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return refuse(413, 'payload_too_large', 'The request is too large.');
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return refuse(413, 'payload_too_large', 'The request is too large.');
  }
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return refuse(400, 'invalid_json', 'The request body is not valid JSON.');
  }
}

/** The attachments plus room for the form fields, still under Vercel's 4.5 MB request limit. */
export const MAX_UPLOAD_BYTES = ATTACHMENT_LIMITS.totalBytes + 64 * 1024;

export type FormBody =
  { ok: true; body: unknown; files: File[] } | { ok: false; response: Response };

/**
 * Reads a submission that may carry files: JSON as before, or multipart with the same JSON in a
 * `json` part and the files as `attachments`. A cross-site form can send multipart without a
 * preflight, so a request from another origin is refused.
 */
export async function readJsonWithFiles(request: Request): Promise<FormBody> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.startsWith('multipart/form-data')) {
    const json = await readJson(request);
    return json.ok ? { ...json, files: [] } : json;
  }
  if (!isSameHost(request)) {
    return refuse(403, 'forbidden_origin', 'The request must come from this site.');
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES) {
    return refuse(413, 'payload_too_large', 'The request is too large.');
  }
  const raw = await readLimited(request, MAX_UPLOAD_BYTES);
  if (!raw) return refuse(413, 'payload_too_large', 'The request is too large.');

  try {
    const form = await new Response(raw, { headers: { 'content-type': type } }).formData();
    const json = form.get('json');
    if (typeof json !== 'string' || new TextEncoder().encode(json).length > MAX_BODY_BYTES) {
      return refuse(400, 'invalid_json', 'The request body is not valid JSON.');
    }
    const files = form.getAll('attachments').filter((part): part is File => part instanceof File);
    return { ok: true, body: JSON.parse(json), files };
  } catch {
    return refuse(400, 'invalid_json', 'The request body is not valid JSON.');
  }
}

/** Browsers send Origin with every POST; the host is compared, as the proxy may report http. */
function isSameHost(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** The whole body, or undefined as soon as it grows past `max` bytes. */
export async function readLimited(
  request: Request,
  max: number,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  if (!request.body) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  // Past the limit the rest is read and dropped rather than cancelled: cancelling a stream its
  // source still writes to throws outside this function. Vercel ends the body at 4.5 MB anyway.
  for await (const chunk of request.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.length;
    if (size <= max) chunks.push(chunk);
  }
  if (size > max) return undefined;
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

function refuse(...args: Parameters<typeof errorResponse>): { ok: false; response: Response } {
  return { ok: false, response: errorResponse(...args) };
}
