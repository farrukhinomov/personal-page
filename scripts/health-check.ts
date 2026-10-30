/**
 * Checks the live site and keeps the `incident` issue in step with the result.
 *
 * Usage: pnpm health-check [base URL]
 *
 * Runs daily in .github/workflows/health-check.yml. Without GITHUB_TOKEN and
 * GITHUB_REPOSITORY (a local run) it only prints the results. It exits with an error only
 * when the site fails and no issue could be filed, so GitHub's own failure email is the
 * fallback alert.
 */
import { runHealthChecks } from '@/ops/health';
import { githubIssues, planIncident, report } from '@/ops/incident';
import { SITE_URL } from '@/seo/structured-data';

const baseUrl = process.argv[2] ?? SITE_URL;
const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SERVER_URL, GITHUB_RUN_ID } = process.env;
const runUrl =
  GITHUB_REPOSITORY && GITHUB_RUN_ID
    ? `${GITHUB_SERVER_URL ?? 'https://github.com'}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
    : 'local run';

const results = await runHealthChecks(baseUrl);
const healthy = results.every((result) => result.ok);
process.stdout.write(`Health check of ${baseUrl}: ${healthy ? 'all checks pass' : 'FAILED'}\n\n`);
process.stdout.write(`${report(results, runUrl)}\n`);

if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  process.exitCode = healthy ? 0 : 1;
} else {
  try {
    const github = githubIssues(GITHUB_REPOSITORY, GITHUB_TOKEN);
    const action = planIncident(results, await github.findOpenIncident(), runUrl);
    await github.apply(action);
    process.stdout.write(`\nIncident: ${action.kind}\n`);
  } catch (error) {
    console.error('Updating the incident issue failed.', error);
    process.exitCode = 1;
  }
}
