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

function refuse(...args: Parameters<typeof errorResponse>): JsonBody {
  return { ok: false, response: errorResponse(...args) };
}
