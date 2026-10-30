/** Machine-readable reasons an API route refuses a request. Clients map them to their own copy. */
export type ErrorCode =
  | 'unsupported_media_type'
  | 'invalid_json'
  | 'payload_too_large'
  | 'forbidden_origin'
  | 'invalid_input'
  | 'invalid_attachment'
  | 'verification_failed'
  | 'rate_limited'
  | 'delivery_failed'
  | 'slots_unavailable'
  | 'slot_unavailable'
  | 'booking_failed'
  | 'unauthorized'
  | 'not_configured'
  | 'summary_failed';

/** The error shape every API route answers with: `{ ok: false, error: { code, message, … } }`. */
export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  extra: { fields?: readonly string[]; headers?: Record<string, string> } = {},
): Response {
  const { fields, headers } = extra;
  return Response.json(
    { ok: false, error: { code, message, ...(fields ? { fields } : {}) } },
    { status, ...(headers ? { headers } : {}) },
  );
}

export function okResponse(): Response {
  return Response.json({ ok: true });
}
