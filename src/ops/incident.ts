import type { CheckResult } from './health';

/**
 * Turns health check results into GitHub issues: one open `incident` issue at a time, a comment
 * for each further failure, and closing it once every check passes again. GitHub emails the
 * Owner about each, so the alert does not depend on the site's own mail service.
 */

export const INCIDENT_LABEL = 'incident';
export const INCIDENT_TITLE = 'Live site health check failed';

export type IncidentAction =
  | { kind: 'none' }
  | { kind: 'open'; title: string; body: string }
  | { kind: 'comment'; issue: number; body: string }
  | { kind: 'close'; issue: number; body: string };

export function planIncident(
  results: readonly CheckResult[],
  openIssue: number | undefined,
  runUrl: string,
): IncidentAction {
  const healthy = results.every((result) => result.ok);
  if (healthy) {
    return openIssue === undefined
      ? { kind: 'none' }
      : {
          kind: 'close',
          issue: openIssue,
          body: `All checks pass again.\n\n${report(results, runUrl)}`,
        };
  }
  return openIssue === undefined
    ? { kind: 'open', title: INCIDENT_TITLE, body: report(results, runUrl) }
    : { kind: 'comment', issue: openIssue, body: `Still failing.\n\n${report(results, runUrl)}` };
}

/** The results as a Markdown table, failed checks first. */
export function report(results: readonly CheckResult[], runUrl: string): string {
  const ordered = [...results].sort((a, b) => Number(a.ok) - Number(b.ok));
  const rows = ordered.map(
    (result) => `| ${result.ok ? 'ok' : '**failed**'} | ${result.name} | ${cell(result.detail)} |`,
  );
  return ['| Result | Check | Detail |', '| --- | --- | --- |', ...rows, '', `Run: ${runUrl}`].join(
    '\n',
  );
}

function cell(text: string): string {
  return text.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

/** The few GitHub REST calls the incident needs, for one repository ("owner/name"). */
export function githubIssues(repository: string, token: string, request: typeof fetch = fetch) {
  const api = `https://api.github.com/repos/${repository}`;

  async function call(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    const response = await request(`${api}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
    return response.json();
  }

  return {
    async findOpenIncident(): Promise<number | undefined> {
      const issues = (await call(
        `/issues?labels=${INCIDENT_LABEL}&state=open&per_page=1&sort=created&direction=asc`,
      )) as { number: number }[];
      return issues[0]?.number;
    },

    async apply(action: IncidentAction): Promise<void> {
      switch (action.kind) {
        case 'none':
          return;
        case 'open':
          await call('/issues', 'POST', {
            title: action.title,
            body: action.body,
            labels: [INCIDENT_LABEL],
          });
          return;
        case 'comment':
          await call(`/issues/${action.issue}/comments`, 'POST', { body: action.body });
          return;
        case 'close':
          await call(`/issues/${action.issue}/comments`, 'POST', { body: action.body });
          await call(`/issues/${action.issue}`, 'PATCH', {
            state: 'closed',
            state_reason: 'completed',
          });
      }
    },
  };
}
