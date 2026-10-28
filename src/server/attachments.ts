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

/** The cheap check of count and total size, which needs no file contents. */
export function checkAttachmentLimits(files: readonly File[]): 'ok' | 'invalid' | 'too_large' {
  if (files.length > ATTACHMENT_LIMITS.files) return 'invalid';
  const total = files.reduce((sum, file) => sum + file.size, 0);
  return total > ATTACHMENT_LIMITS.totalBytes ? 'too_large' : 'ok';
}

/** Checks the uploaded files: count, total size, and that each one really is the type it claims. */
export async function parseAttachments(files: readonly File[]): Promise<ParsedAttachments> {
  const limits = checkAttachmentLimits(files);
  if (limits !== 'ok') return { kind: limits };

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

/**
 * Compares the first bytes with the file format, so a renamed program is refused. Documents are
 * also refused when they carry active content; Gmail scans what passes here once more.
 */
function matchesType(extension: AttachmentExtension, bytes: Uint8Array): boolean {
  switch (extension) {
    case 'pdf':
      return startsWith(bytes, ascii('%PDF-')) && !PDF_ACTIVE_CONTENT.test(latin1(bytes));
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

/** Scripts, actions that start programs, and embedded files in a PDF. */
const PDF_ACTIVE_CONTENT = /\/(JavaScript|JS|Launch|EmbeddedFiles?)\b/;

/** ZIP entries of a Word document that hold macros, ActiveX controls or embedded objects. */
const DOCX_ACTIVE_CONTENT = /vbaProject\.bin$|(^|\/)(activeX|embeddings)\/|oleObject/i;

/**
 * A DOCX is a ZIP archive with `word/document.xml` in it. The entry names are read from the
 * archive's directory, so text that merely contains such a name does not count.
 */
function isWordDocument(bytes: Uint8Array): boolean {
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return false;
  const names = zipEntryNames(bytes);
  return (
    names !== undefined &&
    names.includes('word/document.xml') &&
    !names.some((name) => DOCX_ACTIVE_CONTENT.test(name))
  );
}

const ZIP_END_SIGNATURE = 0x06054b50;
const ZIP_ENTRY_SIGNATURE = 0x02014b50;
/** The end record is 22 bytes plus a comment of up to 64 KB. */
const ZIP_END_SEARCH = 22 + 0xffff;

/** Entry names from a ZIP's central directory, or undefined when the directory is broken. */
export function zipEntryNames(bytes: Uint8Array): string[] | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  const stop = Math.max(0, bytes.length - ZIP_END_SEARCH);
  while (end >= stop && view.getUint32(end, true) !== ZIP_END_SIGNATURE) end -= 1;
  if (end < stop) return undefined;

  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const names: string[] = [];
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== ZIP_ENTRY_SIGNATURE) {
      return undefined;
    }
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    if (offset + 46 + nameLength > bytes.length) return undefined;
    names.push(latin1(bytes.subarray(offset + 46, offset + 46 + nameLength)));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}

function latin1(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes);
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
