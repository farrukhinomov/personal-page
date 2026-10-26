import type { APIRoute, GetStaticPaths } from 'astro';
import { buildCvModel } from '@/cv/model';
import { CV_FILE } from '@/cv/paths';
import { renderCvPdf } from '@/cv/render-pdf';
import { LOCALES, type Locale } from '@/i18n/locales';

/** The CV as PDF per locale, generated at build time from the site data. */
export const getStaticPaths = (() =>
  LOCALES.map((locale) => ({
    params: { file: CV_FILE[locale] },
    props: { locale },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ locale: Locale }> = async ({ props }) =>
  new Response(new Uint8Array(await renderCvPdf(buildCvModel(props.locale, { edition: 'web' }))), {
    headers: { 'Content-Type': 'application/pdf' },
  });
