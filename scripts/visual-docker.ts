/**
 * Runs the visual tests on Linux in the official Playwright image, as CI does, so screenshots
 * match pixel for pixel whatever the local operating system.
 *
 * Usage: pnpm test:visual [--update-snapshots]
 *
 * Builds the site inside the container. node_modules lives in a Docker volume, so the
 * Linux packages never mix with the local ones.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const { version } = JSON.parse(
  readFileSync(join(ROOT, 'node_modules/@playwright/test/package.json'), 'utf8'),
) as { version: string };
const IMAGE = `mcr.microsoft.com/playwright:v${version}-noble`;
// The image's Node no longer ships corepack, so pnpm is installed at the pinned version.
const { packageManager } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  packageManager: string;
};

const forwarded = process.argv.slice(2).join(' ');
const steps = [
  `npm install --global --silent ${packageManager}`,
  'pnpm install --frozen-lockfile',
  'pnpm build',
  `pnpm exec playwright test --project=visual ${forwarded}`,
].join(' && ');

execFileSync(
  'docker',
  [
    'run',
    '--rm',
    '--ipc=host',
    '--env=CI=1',
    `--volume=${ROOT}:/work`,
    '--volume=inomov-online-node-modules:/work/node_modules',
    '--workdir=/work',
    IMAGE,
    'bash',
    '-c',
    steps,
  ],
  { stdio: 'inherit' },
);
