/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        // Route files only wire modules to URLs; the build renders every one of them.
        'src/pages/**',
        'src/content.config.ts',
        // Browser-only DOM glue is covered by the Playwright end-to-end tests, not unit tests.
        'src/scripts/**',
        'src/**/*-client.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
