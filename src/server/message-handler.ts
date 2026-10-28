import { checkAttachmentLimits, parseAttachments } from './attachments';
import { confirmationEmail, notificationEmail, type Email } from './message-mail';
import { parseMessage } from './message';
import type { RateLimitResult } from './rate-limit';
import { rateLimitedResponse } from './rate-limit';
import { errorResponse, okResponse } from './responses';

/** The outside world a Message touches, injected so tests run without network. */
export interface MessageServices {
  verifyTurnstile(token: string, ip: string): Promise<boolean>;
  rateLimit(ip: string): Promise<RateLimitResult>;
  /** Limits confirmations per recipient, so the form cannot flood one inbox from many IPs. */
  confirmationLimit(email: string): Promise<RateLimitResult>;
  send(email: Email): Promise<void>;
}

/**
 * Handles one submitted Message. Cheap checks run first; a Message only counts against the
 * daily limit once Turnstile has passed, so a Visitor's typos never use up their quota.
 * Nothing is stored: the Message exists only in the two emails, its attachments only in the
 * notification.
 */
export async function handleMessage(
  body: unknown,
  ip: string,
  services: MessageServices,
  files: readonly File[] = [],
): Promise<Response> {
  const parsed = parseMessage(body);
  // Bots get the same answer as people, so they cannot tell the honeypot caught them.
  if (parsed.kind === 'bot') return okResponse();
  if (parsed.kind === 'invalid') {
    return errorResponse(422, 'invalid_input', 'Some fields are invalid.', {
      fields: parsed.fields,
    });
  }
  const { message } = parsed;

  const limits = checkAttachmentLimits(files);
  if (limits !== 'ok') return refusedAttachments(limits);

  if (!(await services.verifyTurnstile(message.turnstileToken, ip))) {
    return errorResponse(403, 'verification_failed', 'The bot check failed. Please try again.');
  }

  const limit = await services.rateLimit(ip);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  // The file contents are only read for someone who passed both checks.
  const attachments = await parseAttachments(files);
  if (attachments.kind !== 'valid') return refusedAttachments(attachments.kind);

  try {
    await services.send(notificationEmail(message, attachments.attachments));
  } catch (error) {
    console.error('Delivering a Message failed.', error);
    return errorResponse(502, 'delivery_failed', 'The message could not be sent.');
  }

  // Farrukh has the Message; a lost confirmation must not make the sender try again.
  try {
    if (!(await services.confirmationLimit(message.email)).allowed) return okResponse();
    await services.send(confirmationEmail(message));
  } catch (error) {
    console.error('Sending the confirmation failed.', error);
  }
  return okResponse();
}

function refusedAttachments(kind: 'invalid' | 'too_large'): Response {
  return kind === 'too_large'
    ? errorResponse(413, 'payload_too_large', 'The attachments are too large.')
    : errorResponse(422, 'invalid_attachment', 'An attachment is not allowed.');
}
