import { describe, expect, it, vi } from 'vitest';
import type { CheckResult } from './health';
import { githubIssues, INCIDENT_TITLE, planIncident, report } from './incident';

const RUN = 'https://github.com/farrukhinomov/personal-page/actions/runs/1';
const PASSING: CheckResult[] = [
  { name: 'Page /', ok: true, detail: 'HTTP 200' },
  { name: 'MCP tools', ok: true, detail: '10 tools' },
];
const FAILING: CheckResult[] = [
  { name: 'Page /', ok: true, detail: 'HTTP 200' },
  { name: 'MCP tools', ok: false, detail: 'HTTP 500 | retry' },
];

describe('planIncident', () => {
  it('does nothing while the site is healthy and no incident is open', () => {
    expect(planIncident(PASSING, undefined, RUN)).toEqual({ kind: 'none' });
  });

  it('opens an incident on the first failure', () => {
    expect(planIncident(FAILING, undefined, RUN)).toEqual({
      kind: 'open',
      title: INCIDENT_TITLE,
      body: report(FAILING, RUN),
    });
  });

  it('comments on the open incident instead of opening another', () => {
    const action = planIncident(FAILING, 80, RUN);

    expect(action).toMatchObject({ kind: 'comment', issue: 80 });
    expect(action.kind === 'comment' && action.body).toMatch(/^Still failing\./);
  });

  it('closes the open incident once every check passes again', () => {
    const action = planIncident(PASSING, 80, RUN);

    expect(action).toMatchObject({ kind: 'close', issue: 80 });
    expect(action.kind === 'close' && action.body).toMatch(/^All checks pass again\./);
  });
});

describe('report', () => {
  it('lists failed checks first in a Markdown table, with the run link', () => {
    expect(report(FAILING, RUN).split('\n')).toEqual([
      '| Result | Check | Detail |',
      '| --- | --- | --- |',
      '| **failed** | MCP tools | HTTP 500 \\| retry |',
      '| ok | Page / | HTTP 200 |',
      '',
      `Run: ${RUN}`,
    ]);
  });
});

describe('githubIssues', () => {
  function fakeGitHub(responses: unknown[] = []) {
    const calls: { url: string; method: string; body: unknown; auth: string | null }[] = [];
    const fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(url),
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        auth: new Headers(init?.headers).get('Authorization'),
      });
      return Response.json(responses.shift() ?? {});
    });
    const github = githubIssues('owner/repo', 'token', fetch as unknown as typeof globalThis.fetch);
    return { github, calls };
  }

  it('finds the oldest open incident issue', async () => {
    const { github, calls } = fakeGitHub([[{ number: 80 }]]);

    expect(await github.findOpenIncident()).toBe(80);
    expect(calls[0]?.url).toBe(
      'https://api.github.com/repos/owner/repo/issues?labels=incident&state=open&per_page=1&sort=created&direction=asc',
    );
    expect(calls[0]?.auth).toBe('Bearer token');
  });

  it('finds none when no incident is open', async () => {
    const { github } = fakeGitHub([[]]);

    expect(await github.findOpenIncident()).toBeUndefined();
  });

  it('opens a labeled issue', async () => {
    const { github, calls } = fakeGitHub();

    await github.apply({ kind: 'open', title: 'T', body: 'B' });

    expect(calls).toEqual([
      {
        url: 'https://api.github.com/repos/owner/repo/issues',
        method: 'POST',
        body: { title: 'T', body: 'B', labels: ['incident'] },
        auth: 'Bearer token',
      },
    ]);
  });

  it('comments on an issue', async () => {
    const { github, calls } = fakeGitHub();

    await github.apply({ kind: 'comment', issue: 80, body: 'B' });

    expect(calls.map(({ url, method, body }) => ({ url, method, body }))).toEqual([
      {
        url: 'https://api.github.com/repos/owner/repo/issues/80/comments',
        method: 'POST',
        body: { body: 'B' },
      },
    ]);
  });

  it('comments, then closes the issue as completed', async () => {
    const { github, calls } = fakeGitHub();

    await github.apply({ kind: 'close', issue: 80, body: 'B' });

    expect(calls.map(({ url, method, body }) => ({ url, method, body }))).toEqual([
      {
        url: 'https://api.github.com/repos/owner/repo/issues/80/comments',
        method: 'POST',
        body: { body: 'B' },
      },
      {
        url: 'https://api.github.com/repos/owner/repo/issues/80',
        method: 'PATCH',
        body: { state: 'closed', state_reason: 'completed' },
      },
    ]);
  });

  it('does nothing for no action', async () => {
    const { github, calls } = fakeGitHub();

    await github.apply({ kind: 'none' });

    expect(calls).toEqual([]);
  });

  it('fails loudly when GitHub refuses', async () => {
    const fetch = vi.fn(async () => new Response('', { status: 403 }));
    const github = githubIssues('owner/repo', 'token', fetch as unknown as typeof globalThis.fetch);

    await expect(github.findOpenIncident()).rejects.toThrow(
      /^GitHub GET \/issues\?labels=incident.*: HTTP 403$/,
    );
  });
});
