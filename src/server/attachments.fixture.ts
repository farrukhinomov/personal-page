/** The first bytes of each allowed file type, enough to pass the content check, for tests. */
export const bytes = (...parts: (string | readonly number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === 'string' ? [...part].map((char) => char.charCodeAt(0)) : [...part],
    ),
  );

export const SAMPLE_FILES = {
  pdf: bytes('%PDF-1.7\n'),
  png: bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]),
  jpg: bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0]),
  webp: bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '),
  docx: bytes([0x50, 0x4b, 0x03, 0x04], '....[Content_Types].xml....word/document.xml'),
};
