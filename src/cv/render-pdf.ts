import PDFDocument from 'pdfkit';
import { loadGeist } from '@/lib/fonts';
import type { CvEntry, CvModel } from './model';

/** Lays out a CV model on A4 pages. Content decisions live in model.ts, not here. */

const PAGE = { margin: 56, footerGap: 28 } as const;

/** Print-friendly versions of the site tokens (light theme). */
const COLOR = { text: '#0f1e28', muted: '#4b6170', accent: '#08707f', rule: '#d3dde3' } as const;

const SIZE = { name: 22, role: 12, heading: 12, title: 10.5, body: 9.5, small: 8.5 } as const;

/** Space needed below an entry title before it is worth starting on this page. */
const MIN_ENTRY_SPACE = 70;

function toBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export async function renderCvPdf(cv: CvModel): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: PAGE.margin,
      bottom: PAGE.margin + PAGE.footerGap,
      left: PAGE.margin,
      right: PAGE.margin,
    },
    bufferPages: true,
    lang: cv.locale,
    displayTitle: true,
    info: {
      Title: `${cv.name} – ${cv.role}`,
      Author: cv.name,
      Subject: cv.role,
      Keywords: cv.sections[0]?.entries.map((entry) => entry.text).join(', ') ?? '',
    },
  });
  const done = toBuffer(doc);

  doc.registerFont('regular', await loadGeist(400));
  doc.registerFont('semibold', await loadGeist(600));
  const width = doc.page.width - PAGE.margin * 2;
  const bottom = () => doc.page.height - PAGE.margin - PAGE.footerGap;

  // Header
  doc.font('semibold').fontSize(SIZE.name).fillColor(COLOR.text).text(cv.name);
  doc.font('regular').fontSize(SIZE.role).fillColor(COLOR.accent).text(cv.role);
  doc
    .moveDown(0.3)
    .fontSize(SIZE.small)
    .fillColor(COLOR.muted)
    .text(cv.contact.map((item) => item.text).join('   '));
  doc
    .moveDown(0.8)
    .fontSize(SIZE.body)
    .fillColor(COLOR.text)
    .text(cv.summary, { width, lineGap: 2 });

  const entry = (item: CvEntry) => {
    if (doc.y > bottom() - MIN_ENTRY_SPACE) doc.addPage();
    doc.moveDown(0.5).font('semibold').fontSize(SIZE.title).fillColor(COLOR.text);
    doc.text(item.title, { width, continued: Boolean(item.subtitle) });
    if (item.subtitle) doc.font('regular').fillColor(COLOR.muted).text(`  ${item.subtitle}`);
    const meta = [item.period, item.place, ...(item.links ?? []).map((link) => link.text)]
      .filter(Boolean)
      .join('   ');
    if (meta) doc.font('regular').fontSize(SIZE.small).fillColor(COLOR.muted).text(meta, { width });
    if (item.text) {
      doc.moveDown(0.2).font('regular').fontSize(SIZE.body).fillColor(COLOR.text);
      doc.text(item.text, { width, lineGap: 1.5 });
    }
    for (const bullet of item.bullets ?? []) {
      doc.font('regular').fontSize(SIZE.body).fillColor(COLOR.text);
      doc.text(`•  ${bullet}`, { width, indent: 0, lineGap: 1.5 });
    }
    if (item.footnote) {
      doc.moveDown(0.1).fontSize(SIZE.small).fillColor(COLOR.muted).text(item.footnote, { width });
    }
  };

  for (const section of cv.sections) {
    if (doc.y > bottom() - MIN_ENTRY_SPACE) doc.addPage();
    doc
      .moveDown(1.1)
      .font('semibold')
      .fontSize(SIZE.heading)
      .fillColor(COLOR.accent)
      .text(section.heading);
    const ruleY = doc.y + 2;
    doc
      .moveTo(PAGE.margin, ruleY)
      .lineTo(PAGE.margin + width, ruleY)
      .lineWidth(0.6)
      .strokeColor(COLOR.rule)
      .stroke();
    doc.y = ruleY + 2;
    section.entries.forEach(entry);
  }

  // Footer with page numbers on every page.
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    // Text below the bottom margin would otherwise start a new page.
    doc.page.margins.bottom = 0;
    const y = doc.page.height - PAGE.margin;
    doc.font('regular').fontSize(SIZE.small).fillColor(COLOR.muted);
    doc.text(cv.footer, PAGE.margin, y, { width, lineBreak: false });
    doc.text(`${index - range.start + 1}/${range.count}`, PAGE.margin, y, {
      width,
      align: 'right',
      lineBreak: false,
    });
  }

  doc.end();
  return done;
}
