import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  Packer,
  Paragraph,
  type ParagraphChild,
} from 'docx';
import { z } from 'astro/zod';
import { formatDate } from '@/data/dates';
import { LOCALES } from '@/i18n/locales';
import {
  COLOR,
  documentBase,
  pageProperties,
  pt,
  run,
  spacing,
  type EmbeddedFont,
} from './docx-style';

/**
 * A cover letter in the CV's design. Letters are written per application and kept
 * outside the repository (see scripts/cv/letter.ts); only the layout lives here.
 */

const line = z.string().trim().min(1);

export const letterSchema = z.object({
  locale: z.enum(LOCALES),
  sender: z.object({
    name: line,
    /** Location, email and web addresses; emails and URLs become links. */
    contact: z.array(line).min(1),
  }),
  recipient: z.array(line).min(1),
  subject: line,
  place: line,
  date: z.iso.date(),
  salutation: line,
  paragraphs: z.array(line).min(1),
  closing: line,
});

export type Letter = z.infer<typeof letterSchema>;

const SIZE = { name: 20, body: 10, small: 8.5, subject: 10.5 } as const;
const BODY_LINE = 276; // 1.15 line height

/** The link a contact line points to, if it is an email or web address. */
export function contactUrl(text: string): string | undefined {
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(text)) return `mailto:${text}`;
  if (/^https?:\/\//i.test(text)) return text;
  if (/^(www\.)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(text)) return `https://${text}`;
  return undefined;
}

function contactLine(contact: readonly string[]): ParagraphChild[] {
  return contact.flatMap((text, index) => {
    const label = run(text, { color: COLOR.muted, size: pt(SIZE.small) });
    const url = contactUrl(text);
    return [
      ...(index > 0 ? [run('  |  ', { color: COLOR.rule, size: pt(SIZE.small) })] : []),
      url ? new ExternalHyperlink({ link: url, children: [label] }) : label,
    ];
  });
}

const body = (text: string, after: number = 7, keepNext = false) =>
  new Paragraph({
    keepNext,
    spacing: { after: spacing(after), line: BODY_LINE },
    children: [run(text)],
  });

/** Place and date line, e.g. "Saarbrücken, 26. Oktober 2026". */
export const letterDate = (letter: Pick<Letter, 'place' | 'date' | 'locale'>) =>
  `${letter.place}, ${formatDate(new Date(letter.date), letter.locale)}`;

export async function renderLetterDocx(letter: Letter, font: EmbeddedFont): Promise<Buffer> {
  const date = letterDate(letter);
  const doc = new Document({
    title: letter.subject,
    creator: letter.sender.name,
    lastModifiedBy: letter.sender.name,
    ...documentBase(font, letter.locale, SIZE.body),
    sections: [
      {
        properties: pageProperties,
        children: [
          new Paragraph({
            children: [
              run(letter.sender.name, { bold: true, color: COLOR.accent, size: pt(SIZE.name) }),
            ],
          }),
          new Paragraph({
            spacing: { before: spacing(4), after: spacing(22) },
            children: contactLine(letter.sender.contact),
          }),
          ...letter.recipient.map((text) => new Paragraph({ children: [run(text)] })),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: spacing(16), after: spacing(14) },
            children: [run(date)],
          }),
          new Paragraph({
            spacing: { after: spacing(12), line: BODY_LINE },
            children: [run(letter.subject, { bold: true, size: pt(SIZE.subject) })],
          }),
          body(letter.salutation),
          ...letter.paragraphs.map((text) => body(text)),
          // Closing and name stay on one page.
          body(letter.closing, 26, true),
          body(letter.sender.name, 0),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
