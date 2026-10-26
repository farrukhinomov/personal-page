import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { loadGeist } from '@/lib/fonts';
import { OG_IMAGE_SIZE } from './og';

/**
 * Renders Open Graph images at build time (never in the browser or at request time).
 * Colours match the dark theme in src/styles/tokens.css.
 */

const COLOR = {
  bg: '#0e161d',
  /* The tokens' --color-line at reduced opacity, so the grid stays texture. */
  grid: 'rgba(36, 55, 68, 0.5)',
  fg: '#e4ecf0',
  muted: '#93a7b3',
  signal: '#5cd6e5',
  status: '#f0b54a',
} as const;

export interface OgCard {
  /** Small line above the title, e.g. the section name. */
  kicker: string;
  title: string;
  subtitle?: string | undefined;
}

/** Satori needs raw font files (not woff2). */
async function loadFonts() {
  return Promise.all(
    ([400, 600] as const).map(async (weight) => ({
      name: 'Geist',
      weight,
      data: await loadGeist(weight),
    })),
  );
}

/** Minimal element factory, so this file needs no JSX runtime. */
type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});

function card({ kicker, title, subtitle }: OgCard): Node {
  return h(
    'div',
    {
      width: OG_IMAGE_SIZE.width,
      height: OG_IMAGE_SIZE.height,
      backgroundColor: COLOR.bg,
      backgroundImage: `linear-gradient(${COLOR.grid} 1px, transparent 1px), linear-gradient(90deg, ${COLOR.grid} 1px, transparent 1px)`,
      backgroundSize: '56px 56px',
      color: COLOR.fg,
      fontFamily: 'Geist',
    },
    // Margins instead of padding: Satori sizes padded boxes content-box, which would push
    // the footer off the canvas.
    h(
      'div',
      {
        flexGrow: 1,
        flexDirection: 'column',
        justifyContent: 'space-between',
        margin: '64px 80px',
      },
      [
        h('div', { alignItems: 'center', gap: 16, fontSize: 28, color: COLOR.muted }, [
          h('div', { width: 14, height: 14, borderRadius: 7, backgroundColor: COLOR.status }),
          kicker,
        ]),
        h('div', { flexDirection: 'column', gap: 24, maxWidth: 1040 }, [
          h(
            'div',
            {
              fontSize: title.length > 48 ? 64 : 80,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
            },
            title,
          ),
          subtitle
            ? h(
                'div',
                // Block display is required for lineClamp.
                {
                  display: 'block',
                  lineClamp: 2,
                  fontSize: 32,
                  lineHeight: 1.35,
                  color: COLOR.muted,
                },
                subtitle,
              )
            : null,
        ]),
        h('div', { justifyContent: 'space-between', alignItems: 'center', fontSize: 28 }, [
          h('div', { fontWeight: 600 }, 'Farrukh Inomov'),
          h('div', { color: COLOR.signal }, 'inomov.online'),
        ]),
      ],
    ),
  );
}

export async function renderOgImage(content: OgCard): Promise<Uint8Array> {
  const svg = await satori(card(content) as Parameters<typeof satori>[0], {
    ...OG_IMAGE_SIZE,
    fonts: await loadFonts(),
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_IMAGE_SIZE.width } }).render().asPng();
}
