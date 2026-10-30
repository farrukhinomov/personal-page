import { profile } from '@/data/profile';
import { SITE_URL } from './structured-data';

export const SECURITY_TXT_PATH = '/.well-known/security.txt';

/**
 * RFC 9116 asks for an Expires less than a year ahead. The file is built with the site, and the
 * monthly scheduled rebuild moves the date on; the daily health check warns well before it lapses.
 */
export const SECURITY_TXT_VALID_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

export function securityTxtExpiry(builtAt: Date): Date {
  const expires = new Date(builtAt.getTime() + SECURITY_TXT_VALID_DAYS * DAY_MS);
  expires.setUTCHours(0, 0, 0, 0);
  return expires;
}

export function buildSecurityTxt(builtAt: Date): string {
  return [
    `Contact: mailto:${profile.email}`,
    `Expires: ${securityTxtExpiry(builtAt).toISOString().replace('.000Z', 'Z')}`,
    'Preferred-Languages: de, en',
    `Canonical: ${SITE_URL}${SECURITY_TXT_PATH}`,
    '',
  ].join('\n');
}

/** Reads the Expires field of a served security.txt; undefined when it is missing or invalid. */
export function parseSecurityTxtExpiry(text: string): Date | undefined {
  const value = /^Expires:\s*(\S+)\s*$/im.exec(text)?.[1];
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
