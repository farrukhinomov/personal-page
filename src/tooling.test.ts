import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('end-to-end tooling', () => {
  it('runs CI in the Playwright image of the installed version', () => {
    const { version } = JSON.parse(read('node_modules/@playwright/test/package.json')) as {
      version: string;
    };
    const image = read('.github/workflows/ci.yml').match(
      /mcr\.microsoft\.com\/playwright:v([\d.]+)/,
    );

    // A different browser build renders differently, and every screenshot would fail.
    expect(image?.[1]).toBe(version);
  });
});
