import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Tab,
  Paragraph,
  TabStopType,
  TextRun,
  TextWrappingSide,
  TextWrappingType,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  type ParagraphChild,
} from 'docx';
import {
  COLOR,
  documentBase,
  MM,
  pageProperties,
  pt,
  run,
  spacing,
  TEXT_WIDTH,
  type EmbeddedFont,
} from './docx-style';
import type { CvEntry, CvLink, CvModel } from './model';

/** Lays out a CV model as an A4 Word document. Content decisions live in model.ts. */

export interface DocxAssets {
  /** Square PNG portrait, already cropped and rounded. */
  photo: Buffer;
  font: EmbeddedFont;
}

/** Font sizes in points. */
const SIZE = { name: 24, role: 12.5, heading: 11, body: 9.5, small: 8.5 } as const;

const PHOTO_MM = 30;
const PX_PER_MM = 96 / 25.4;

const BULLETS = 'cv-bullets';

const muted = (text: string, size: number = SIZE.small) =>
  run(text, { color: COLOR.muted, size: pt(size) });

function linkRun(item: CvLink, color: string = COLOR.muted): ParagraphChild {
  const label = run(item.text, { color, size: pt(SIZE.small) });
  return item.url ? new ExternalHyperlink({ link: item.url, children: [label] }) : label;
}

/** Links separated by a light vertical bar, which ATS parsers read as a separator. */
function linkLine(items: readonly CvLink[], color?: string): ParagraphChild[] {
  return items.flatMap((item, index) => [
    ...(index > 0 ? [run('  |  ', { color: COLOR.rule, size: pt(SIZE.small) })] : []),
    linkRun(item, color),
  ]);
}

function header(cv: CvModel, assets: DocxAssets): Paragraph[] {
  const side = Math.round(PHOTO_MM * PX_PER_MM);
  const photo = new ImageRun({
    type: 'png',
    data: assets.photo,
    transformation: { width: side, height: side },
    altText: { name: 'photo', title: cv.name, description: cv.name },
    floating: {
      horizontalPosition: {
        relative: HorizontalPositionRelativeFrom.MARGIN,
        align: HorizontalPositionAlign.RIGHT,
      },
      verticalPosition: {
        relative: VerticalPositionRelativeFrom.MARGIN,
        align: VerticalPositionAlign.TOP,
      },
      wrap: { type: TextWrappingType.SQUARE, side: TextWrappingSide.LEFT },
      margins: { left: 228600 }, // 6 mm in EMU
    },
  });
  // The header text stays left of the photo; the rest of the page uses the full width.
  const indent = { right: Math.round((PHOTO_MM + 6) * MM) };
  const [first = [], second = []] = [cv.contact.slice(0, 3), cv.contact.slice(3)];

  return [
    new Paragraph({
      indent,
      children: [photo, run(cv.name, { bold: true, color: COLOR.accent, size: pt(SIZE.name) })],
    }),
    new Paragraph({
      indent,
      spacing: { after: spacing(8) },
      children: [run(cv.role, { size: pt(SIZE.role) })],
    }),
    new Paragraph({ indent, spacing: { after: spacing(2) }, children: linkLine(first) }),
    new Paragraph({ indent, spacing: { after: spacing(12) }, children: linkLine(second) }),
    new Paragraph({
      spacing: { after: spacing(4), line: 276 },
      children: [run(cv.summary)],
    }),
  ];
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    keepNext: true,
    spacing: { before: spacing(14), after: spacing(6) },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.rule, space: 2 } },
    children: [run(text, { bold: true, color: COLOR.accent, size: pt(SIZE.heading) })],
  });
}

function entry(item: CvEntry): Paragraph[] {
  const simple = !item.subtitle && !item.period && !item.text && !item.bullets && !item.links;
  if (simple) {
    return [new Paragraph({ spacing: { after: spacing(2) }, children: [run(item.title)] })];
  }

  const hasMore = [item.place, item.links, item.text, item.bullets, item.footnote].some(Boolean);
  const paragraphs: Paragraph[] = [
    new Paragraph({
      keepNext: hasMore,
      keepLines: true,
      spacing: { before: spacing(7), after: spacing(1) },
      tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
      children: [
        run(item.title, { bold: true, size: pt(10) }),
        ...(item.subtitle ? [run(`  ${item.subtitle}`, { color: COLOR.muted, size: pt(10) })] : []),
        ...(item.period ? [new TextRun({ children: [new Tab()] }), muted(item.period)] : []),
      ],
    }),
  ];
  const details = [
    ...(item.place ? [muted(item.place)] : []),
    ...(item.place && item.links ? [muted('  |  ')] : []),
    ...(item.links ? linkLine(item.links, COLOR.accent) : []),
  ];
  if (details.length > 0) {
    paragraphs.push(
      new Paragraph({ keepNext: true, spacing: { after: spacing(2) }, children: details }),
    );
  }
  if (item.text) {
    paragraphs.push(
      new Paragraph({ spacing: { after: spacing(2), line: 264 }, children: [run(item.text)] }),
    );
  }
  for (const bullet of item.bullets ?? []) {
    paragraphs.push(
      new Paragraph({
        numbering: { reference: BULLETS, level: 0 },
        spacing: { after: spacing(1), line: 264 },
        children: [run(bullet)],
      }),
    );
  }
  if (item.footnote) {
    paragraphs.push(
      new Paragraph({ spacing: { before: spacing(2) }, children: [muted(item.footnote)] }),
    );
  }
  return paragraphs;
}

function footer(cv: CvModel): Footer {
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
        children: [
          muted(cv.footer, 7.5),
          new TextRun({ children: [new Tab()] }),
          new TextRun({
            children: [PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
            color: COLOR.muted,
            size: pt(7.5),
          }),
        ],
      }),
    ],
  });
}

export async function renderCvDocx(cv: CvModel, assets: DocxAssets): Promise<Buffer> {
  const doc = new Document({
    title: `${cv.name} – ${cv.role}`,
    subject: cv.role,
    creator: cv.name,
    lastModifiedBy: cv.name,
    ...documentBase(assets.font, cv.locale, SIZE.body),
    numbering: {
      config: [
        {
          reference: BULLETS,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: Math.round(4.5 * MM), hanging: Math.round(3 * MM) } },
                run: { font: assets.font.name, color: COLOR.accent },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: pageProperties,
        footers: { default: footer(cv) },
        children: [
          ...header(cv, assets),
          ...cv.sections.flatMap((section) => [
            sectionHeading(section.heading),
            ...section.entries.flatMap(entry),
          ]),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
