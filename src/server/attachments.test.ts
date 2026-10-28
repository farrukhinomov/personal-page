import { describe, expect, it } from 'vitest';
import { ATTACHMENT_LIMITS, formatSize, parseAttachments, safeFilename } from './attachments';
import { bytes, SAMPLE_FILES as FILES } from './attachments.fixture';

const file = (name: string, content: Uint8Array<ArrayBuffer>) => new File([content], name);

describe('parseAttachments', () => {
  it.each([
    ['cv.pdf', FILES.pdf, 'cv.pdf', 'application/pdf'],
    ['Shot.PNG', FILES.png, 'Shot.png', 'image/png'],
    ['photo.jpeg', FILES.jpg, 'photo.jpeg', 'image/jpeg'],
    ['photo.webp', FILES.webp, 'photo.webp', 'image/webp'],
    [
      'brief.docx',
      FILES.docx,
      'brief.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  ])('accepts %s with its own content type', async (name, content, filename, contentType) => {
    const parsed = await parseAttachments([file(name, content)]);

    expect(parsed).toEqual({ kind: 'valid', attachments: [{ filename, contentType, content }] });
  });

  it('accepts no files at all', async () => {
    expect(await parseAttachments([])).toEqual({ kind: 'valid', attachments: [] });
  });

  it.each([
    ['a renamed program', file('cv.pdf', bytes('MZ', [0x90, 0]))],
    ['an image named as a PDF', file('cv.pdf', FILES.png)],
    ['a file type that is not allowed', file('setup.exe', bytes('MZ'))],
    ['a file without extension', file('README', FILES.pdf)],
    ['an empty file', file('empty.pdf', new Uint8Array())],
    ['any ZIP named as Word', file('brief.docx', bytes([0x50, 0x4b, 0x03, 0x04], 'data.csv'))],
    [
      'a Word document with macros',
      file('brief.docx', bytes([...FILES.docx], 'word/vbaProject.bin')),
    ],
  ])('refuses %s', async (_, upload) => {
    expect(await parseAttachments([upload])).toEqual({ kind: 'invalid' });
  });

  it('refuses more files than allowed', async () => {
    const files = Array.from({ length: ATTACHMENT_LIMITS.files + 1 }, (_, index) =>
      file(`${index}.pdf`, FILES.pdf),
    );

    expect(await parseAttachments(files)).toEqual({ kind: 'invalid' });
  });

  it('refuses files that are too large together', async () => {
    const half = new Uint8Array(ATTACHMENT_LIMITS.totalBytes / 2 + 1);
    half.set(FILES.pdf);

    expect(await parseAttachments([file('a.pdf', half), file('b.pdf', half)])).toEqual({
      kind: 'too_large',
    });
  });
});

describe('safeFilename', () => {
  it('keeps a readable name and drops paths and header-breaking characters', () => {
    expect(safeFilename('C:\\fakepath\\Stellenanzeige Müller.pdf', 'pdf')).toBe(
      'Stellenanzeige Müller.pdf',
    );
    expect(safeFilename('../../etc/passwd.pdf', 'pdf')).toBe('passwd.pdf');
    expect(safeFilename('a\r\nBcc: x@example.com.pdf', 'pdf')).toBe('a__Bcc_ x_example.com.pdf');
    expect(safeFilename('"quoted".PNG', 'png')).toBe('_quoted_.png');
  });

  it('names a file that has nothing usable left', () => {
    expect(safeFilename('.pdf', 'pdf')).toBe('attachment.pdf');
    expect(safeFilename(`${'x'.repeat(300)}.pdf`, 'pdf')).toBe(`${'x'.repeat(100)}.pdf`);
  });
});

describe('formatSize', () => {
  it('shows kilobytes below a megabyte and megabytes above', () => {
    expect(formatSize(10)).toBe('1 KB');
    expect(formatSize(820 * 1024)).toBe('820 KB');
    expect(formatSize(1.4 * 1024 * 1024)).toBe('1.4 MB');
  });
});
