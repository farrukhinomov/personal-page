import { TextRun, type IPropertiesOptions, type IRunOptions, type ISectionOptions } from 'docx';
import type { Locale } from '@/i18n/locales';

/** Design shared by the CV and the cover letter, so both read as one set. */

/** Regular and bold faces, embedded so a document looks the same without the font installed. */
export interface EmbeddedFont {
  name: string;
  regular: Buffer;
  bold: Buffer;
}

/** Print versions of the site tokens (light theme). */
export const COLOR = { text: '0F1E28', muted: '4B6170', accent: '08707F', rule: 'D3DDE3' } as const;

export const MM = 56.7; // twips per millimetre

/** A4 in twips, with the CV's margins. */
export const PAGE = {
  width: 11906,
  height: 16838,
  marginX: 18 * MM,
  marginTop: 16 * MM,
  marginBottom: 16 * MM,
} as const;

export const TEXT_WIDTH = PAGE.width - 2 * PAGE.marginX;

/** Font size in points to Word's half-points. */
export const pt = (points: number) => Math.round(points * 2);

/** Spacing in points to twips. */
export const spacing = (points: number) => Math.round(points * 20);

export const run = (text: string, options: Omit<IRunOptions, 'text'> = {}) =>
  new TextRun({ text, ...options });

/** Embedded font, default text style and document language. */
export function documentBase(
  font: EmbeddedFont,
  locale: Locale,
  bodySize: number,
): Pick<IPropertiesOptions, 'fonts' | 'styles'> {
  return {
    fonts: [{ name: font.name, data: font.regular, bold: font.bold }],
    styles: {
      default: {
        document: {
          run: {
            font: font.name,
            size: pt(bodySize),
            color: COLOR.text,
            language: { value: locale === 'de' ? 'de-DE' : 'en-GB' },
          },
          paragraph: { spacing: { after: 0, line: 252 } },
        },
      },
    },
  };
}

export const pageProperties: NonNullable<ISectionOptions['properties']> = {
  page: {
    size: { width: PAGE.width, height: PAGE.height },
    margin: {
      top: PAGE.marginTop,
      bottom: PAGE.marginBottom,
      left: PAGE.marginX,
      right: PAGE.marginX,
      footer: Math.round(8 * MM),
    },
  },
};
