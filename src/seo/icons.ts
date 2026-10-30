import { Resvg } from '@resvg/resvg-js';

/**
 * The site icon, drawn once and rendered at build time into every format browsers ask for:
 * favicon.svg for current browsers, favicon.ico for older ones and tools that only request
 * /favicon.ico, and apple-touch-icon.png for iOS home-screen bookmarks.
 */

const COLOR = { bg: '#0e161d', mark: '#5cd6e5' } as const;

/** iOS rounds the corners itself, so its icon is a full square; the favicon rounds its own. */
export type IconShape = 'rounded' | 'square';

export const FAVICON_ICO_SIZES = [16, 32, 48] as const;
export const APPLE_TOUCH_ICON_SIZE = 180;

export function iconSvg(shape: IconShape = 'rounded'): string {
  const radius = shape === 'rounded' ? ' rx="7"' : '';
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">',
    `  <rect width="32" height="32"${radius} fill="${COLOR.bg}"/>`,
    `  <path d="M9 23V9h8M9 16h6M21 9v14" fill="none" stroke="${COLOR.mark}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    '</svg>',
    '',
  ].join('\n');
}

export function renderIconPng(size: number, shape: IconShape): Uint8Array {
  return new Resvg(iconSvg(shape), { fitTo: { mode: 'width', value: size } }).render().asPng();
}

/** An ICO file whose images are PNGs, a variant every current browser reads. */
export function buildIco(images: readonly { size: number; png: Uint8Array }[]): Uint8Array {
  const HEADER = 6;
  const ENTRY = 16;
  const header = new DataView(new ArrayBuffer(HEADER + ENTRY * images.length));
  header.setUint16(2, 1, true); // type: icon
  header.setUint16(4, images.length, true);

  let offset = header.byteLength;
  images.forEach(({ size, png }, i) => {
    const entry = HEADER + ENTRY * i;
    header.setUint8(entry, size % 256); // 0 means 256
    header.setUint8(entry + 1, size % 256);
    header.setUint16(entry + 4, 1, true); // colour planes
    header.setUint16(entry + 6, 32, true); // bits per pixel
    header.setUint32(entry + 8, png.byteLength, true);
    header.setUint32(entry + 12, offset, true);
    offset += png.byteLength;
  });

  const ico = new Uint8Array(offset);
  ico.set(new Uint8Array(header.buffer));
  let at = header.byteLength;
  for (const { png } of images) {
    ico.set(png, at);
    at += png.byteLength;
  }
  return ico;
}

export function renderFaviconIco(): Uint8Array {
  return buildIco(FAVICON_ICO_SIZES.map((size) => ({ size, png: renderIconPng(size, 'rounded') })));
}
