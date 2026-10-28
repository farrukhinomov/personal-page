/** The first bytes of each allowed file type, enough to pass the content check, for tests. */
export const bytes = (...parts: (string | readonly number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === 'string' ? [...part].map((char) => char.charCodeAt(0)) : [...part],
    ),
  );

/** A ZIP archive with the given entry names in its central directory and no content. */
export function zip(names: readonly string[]): Uint8Array<ArrayBuffer> {
  const local = bytes([0x50, 0x4b, 0x03, 0x04], new Array<number>(26).fill(0));
  const entries = names.map((name) => {
    const header = new Uint8Array(46 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(28, name.length, true);
    header.set(bytes(name), 46);
    return header;
  });
  const directorySize = entries.reduce((sum, entry) => sum + entry.length, 0);
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, names.length, true);
  view.setUint16(10, names.length, true);
  view.setUint32(12, directorySize, true);
  view.setUint32(16, local.length, true);
  return bytes([...local], ...entries.map((entry) => [...entry]), [...end]);
}

export const SAMPLE_FILES = {
  pdf: bytes('%PDF-1.7\n'),
  png: bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]),
  jpg: bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0]),
  webp: bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '),
  docx: zip(['[Content_Types].xml', '_rels/.rels', 'word/document.xml']),
};
