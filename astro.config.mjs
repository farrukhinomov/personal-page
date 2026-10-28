// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://inomov.online',
  trailingSlash: 'never',
  adapter: vercel(),
  env: {
    // Secrets are read at request time with getSecret(). All documented in .env.example.
    schema: {
      KV_REST_API_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      KV_REST_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CALCOM_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
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
      provider: fontProviders.fontsource(),
      weights: ['100 900'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      provider: fontProviders.fontsource(),
      weights: ['100 800'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
