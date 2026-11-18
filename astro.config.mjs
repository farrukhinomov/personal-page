// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Variable font files from the pinned @fontsource-variable packages, so the build needs no font
 * CDN and every visitor gets the fonts from this site. One variant per subset, with the subset's
 * unicode range from the same package.
 *
 * @param {string} id package id, e.g. `geist`
 * @param {string} weight weight range of the variable font
 */
function localVariableFont(id, weight) {
  const pkg = `@fontsource-variable/${id}`;
  /** @type {Record<string, string | undefined>} */
  const ranges = JSON.parse(readFileSync(require.resolve(`${pkg}/unicode.json`), 'utf8'));

  /** @param {'latin' | 'latin-ext'} subset */
  const variant = (subset) => {
    const range = ranges[subset];
    if (!range) throw new Error(`${pkg} has no unicode range for ${subset}`);
    const [first = '', ...rest] = range.split(',');
    return {
      src: /** @type {[string]} */ ([`${pkg}/files/${id}-${subset}-wght-normal.woff2`]),
      weight,
      style: /** @type {const} */ ('normal'),
      unicodeRange: /** @type {[string, ...string[]]} */ ([first, ...rest]),
    };
  };
  /** @type {[ReturnType<typeof variant>, ReturnType<typeof variant>]} */
  const variants = [variant('latin'), variant('latin-ext')];
  return { variants };
}

export default defineConfig({
  site: 'https://inomov.online',
  trailingSlash: 'never',
  // Cookieless page views (issue #76). The script comes from the site's own domain, but only
  // Vercel serves it, so local and CI builds (VERCEL unset) leave it out instead of a 404.
  adapter: vercel({ webAnalytics: { enabled: process.env.VERCEL === '1' } }),
  env: {
    // Secrets are read at request time with getSecret(). All documented in .env.example.
    schema: {
      KV_REST_API_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      KV_REST_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CALCOM_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CRON_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      // Cloudflare's public test key, which always passes, unless Vercel sets the real one.
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
        default: '1x00000000000000000000AA',
      }),
    },
  },
  vite: {
    // When the site was built: server code treats Posts as published exactly as the static pages do.
    define: { __BUILT_AT__: JSON.stringify(new Date().toISOString()) },
  },
  integrations: [
    mdx(),
    // Language alternates are declared per page with <link rel="alternate" hreflang>.
    sitemap({ filter: (page) => !page.includes('/404') && !page.includes('/og/') }),
  ],
  markdown: {
    shikiConfig: {
      // Light colours inline, dark colours as --shiki-dark variables (see src/styles/prose.css).
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    },
  },
  // Hashes every script and style Astro renders into a CSP <meta>. Requires no ClientRouter.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
      styleDirective: {
        // Data-driven CSS variables (e.g. Experience trace positions) are set as style attributes.
        // Attribute styles cannot run script; <style> elements stay hash-restricted.
        resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }],
      },
    },
  },
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  fonts: [
    {
      name: 'Geist',
      cssVariable: '--font-sans',
      provider: fontProviders.local(),
      options: localVariableFont('geist', '100 900'),
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      provider: fontProviders.local(),
      options: localVariableFont('jetbrains-mono', '100 800'),
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
