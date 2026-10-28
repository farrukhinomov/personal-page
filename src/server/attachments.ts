/**
 * Files a Visitor attaches to a Message. They travel with the request, are checked here and leave
 * only as attachments of the notification email; nothing is stored. Pure, so the Message form can
 * share the limits.
 */

/** Vercel accepts request bodies up to 4.5 MB; this leaves room for the form fields. */
export const ATTACHMENT_LIMITS = { files: 3, totalBytes: 4 * 1024 * 1024 } as const;

/** File types a Message can carry, by extension. DOCX cannot hold macros, unlike DOC and DOCM. */
export const ATTACHMENT_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
} as const;

export type AttachmentExtension = keyof typeof ATTACHMENT_TYPES;

export interface Attachment {
  filename: string;
  contentType: string;
  content: Uint8Array;
}

export type ParsedAttachments =
  { kind: 'valid'; attachments: Attachment[] } | { kind: 'invalid' } | { kind: 'too_large' };

/** Checks the uploaded files: count, total size, and that each one really is the type it claims. */
export async function parseAttachments(files: readonly File[]): Promise<ParsedAttachments> {
  if (files.length > ATTACHMENT_LIMITS.files) return { kind: 'invalid' };
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > ATTACHMENT_LIMITS.totalBytes) return { kind: 'too_large' };

  const attachments: Attachment[] = [];
  for (const file of files) {
    const content = new Uint8Array(await file.arrayBuffer());
    const extension = extensionOf(file.name);
    if (!extension || content.length === 0 || !matchesType(extension, content)) {
      return { kind: 'invalid' };
    }
    attachments.push({
      filename: safeFilename(file.name, extension),
      contentType: ATTACHMENT_TYPES[extension],
      content,
    });
  }
  return { kind: 'valid', attachments };
}

export function extensionOf(filename: string): AttachmentExtension | undefined {
  const extension = filename.toLowerCase().split('.').pop() ?? '';
  return Object.hasOwn(ATTACHMENT_TYPES, extension)
    ? (extension as AttachmentExtension)
    : undefined;
}

/** Compares the first bytes with the file format, so a renamed program is refused. */
function matchesType(extension: AttachmentExtension, bytes: Uint8Array): boolean {
  switch (extension) {
    case 'pdf':
      return startsWith(bytes, ascii('%PDF-'));
    case 'png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'jpg':
    case 'jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case 'webp':
      return startsWith(bytes, ascii('RIFF')) && startsWith(bytes.subarray(8), ascii('WEBP'));
    case 'docx':
      return isWordDocument(bytes);
  }
}

/**
 * A DOCX is a ZIP archive. Its entry names are stored uncompressed, so a Word document shows
 * `word/document.xml`, and one with macros `vbaProject.bin`, which is refused.
 */
function isWordDocument(bytes: Uint8Array): boolean {
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return false;
  const text = new TextDecoder('latin1').decode(bytes);
  return text.includes('word/document.xml') && !text.includes('vbaProject.bin');
}

const MAX_FILENAME_LENGTH = 100;

/**
 * A name that is safe in an email header and readable: no path, no control characters, and the
 * extension the content was checked against.
 */
export function safeFilename(filename: string, extension: AttachmentExtension): string {
  const base = (filename.split(/[\\/]/).pop() ?? '')
    .replace(/\.[^.]*$/, '')
    .replace(/[^\p{L}\p{N} ._()-]/gu, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FILENAME_LENGTH);
  return `${base || 'attachment'}.${extension}`;
}

/** A size as people read it, e.g. "820 KB" or "1.4 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((byte, index) => bytes[index] === byte);
}

function ascii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0));
}
