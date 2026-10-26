import type { APIRoute, GetStaticPaths } from 'astro';
import { ogEntries } from '@/seo/og-catalog';
import { renderOgImage, type OgCard } from '@/seo/og-render';

export const getStaticPaths = (async () =>
  (await ogEntries()).map(({ locale, segments, card }) => ({
    params: { path: [locale, ...segments].join('/') },
    props: { card },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ card: OgCard }> = async ({ props }) =>
  new Response(Buffer.from(await renderOgImage(props.card)), {
    headers: { 'Content-Type': 'image/png' },
  });
