/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Browser-only DOM glue is covered by the Playwright end-to-end tests, not unit tests.
      exclude: ['src/**/*.test.ts', 'src/env.d.ts', 'src/scripts/**', 'src/**/*-client.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
