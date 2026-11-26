/**
 * Lighthouse CI: mobile audits of the production build (`pnpm build` first), served by
 * `pnpm preview` (Vercel's `serve`), which compresses like Vercel. Run with `pnpm test:lighthouse`.
 * Budgets from issue #16: every category ≥ 95, ≤ 60 KB compressed JS per page. LCP was < 2 s
 * until Lighthouse 13 (@lhci/cli 0.16) simulated the hero portrait ~0.2 s later on the same
 * pages; it is now the Core Web Vitals "good" threshold, 2.5 s.
 */
const PORT = 4323;

/** One page per layout, in both locales where the layout differs by language. */
const PAGES = ['/', '/en', '/projekte/kritis-grc', '/ueber-mich'];

const MIN_SCORE = 0.95;
const MAX_LCP_MS = 2500;
const MAX_SCRIPT_BYTES = 60 * 1024;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `pnpm preview --listen ${PORT}`,
      startServerReadyPattern: 'localhost',
      url: PAGES.map((path) => `http://localhost:${PORT}${path}`),
      // The median of three runs evens out a noisy machine.
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': [
          'error',
          { minScore: MIN_SCORE, aggregationMethod: 'median-run' },
        ],
        'categories:accessibility': ['error', { minScore: MIN_SCORE }],
        'categories:best-practices': ['error', { minScore: MIN_SCORE }],
        'categories:seo': ['error', { minScore: MIN_SCORE }],
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: MAX_LCP_MS, aggregationMethod: 'median-run' },
        ],
        'resource-summary:script:size': ['error', { maxNumericValue: MAX_SCRIPT_BYTES }],
      },
    },
    // Reports stay local and become a CI artifact; nothing is uploaded to a public server.
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
};
