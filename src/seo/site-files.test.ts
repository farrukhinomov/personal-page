import { describe, expect, it } from 'vitest';
import {
  APPLE_TOUCH_ICON_SIZE,
  buildIco,
  FAVICON_ICO_SIZES,
  iconSvg,
  renderFaviconIco,
  renderIconPng,
} from './icons';
import { buildSecurityTxt, parseSecurityTxtExpiry } from './security-txt';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

function pngSize(png: Uint8Array): [number, number] {
  const view = new DataView(png.buffer, png.byteOffset);
  return [view.getUint32(16), view.getUint32(20)];
}

describe('security.txt', () => {
  const builtAt = new Date('2026-10-30T15:47:00Z');

  it('has the fields RFC 9116 asks for, pointing to the primary email', () => {
    expect(buildSecurityTxt(builtAt)).toBe(
      [
        'Contact: mailto:farrukh@inomov.online',
        'Expires: 2027-04-28T00:00:00Z',
        'Preferred-Languages: de, en',
        'Canonical: https://inomov.online/.well-known/security.txt',
        '',
      ].join('\n'),
    );
  });

  it('expires less than a year after the build', () => {
    const expires = parseSecurityTxtExpiry(buildSecurityTxt(builtAt));
    const days = ((expires?.getTime() ?? 0) - builtAt.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(150);
    expect(days).toBeLessThan(365);
  });

  it('reads no expiry from a file without a valid Expires field', () => {
    expect(parseSecurityTxtExpiry('Contact: mailto:x@example.com')).toBeUndefined();
    expect(parseSecurityTxtExpiry('Expires: soon')).toBeUndefined();
  });
});

describe('icons', () => {
  it('rounds the favicon itself and leaves the corners of the iOS icon to iOS', () => {
    expect(iconSvg('rounded')).toContain('rx="7"');
    expect(iconSvg('square')).not.toContain('rx=');
  });

  it('renders the iOS icon as a 180×180 PNG', () => {
    const png = renderIconPng(APPLE_TOUCH_ICON_SIZE, 'square');
    expect([...png.slice(0, 4)]).toEqual(PNG_SIGNATURE);
    expect(pngSize(png)).toEqual([180, 180]);
  });

  it('packs 16, 32 and 48 px PNGs into favicon.ico', () => {
    const ico = renderFaviconIco();
    const view = new DataView(ico.buffer, ico.byteOffset);
    expect([view.getUint16(0, true), view.getUint16(2, true)]).toEqual([0, 1]);
    expect(view.getUint16(4, true)).toBe(FAVICON_ICO_SIZES.length);

    FAVICON_ICO_SIZES.forEach((size, i) => {
      const entry = 6 + 16 * i;
      expect(view.getUint8(entry)).toBe(size);
      const length = view.getUint32(entry + 8, true);
      const offset = view.getUint32(entry + 12, true);
      const png = ico.slice(offset, offset + length);
      expect([...png.slice(0, 4)]).toEqual(PNG_SIGNATURE);
      expect(pngSize(png)).toEqual([size, size]);
    });
  });

  it('writes 256 px as 0 in the ICO directory, as the format requires', () => {
    const ico = buildIco([{ size: 256, png: new Uint8Array(4) }]);
    expect(ico[6]).toBe(0);
    expect(ico[7]).toBe(0);
  });
});
