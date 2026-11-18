import type { Localized } from '@/i18n/locales';

/** `live` works today; `skeleton` exists but serves no real data yet; `planned` does not exist yet. */
export type NodeStatus = 'live' | 'skeleton' | 'planned';
export type EdgeStatus = 'live' | 'planned';

export interface DiagramNode {
  id: string;
  label: Localized;
  detail: Localized;
  status: NodeStatus;
  /** Top-left corner in diagram units. */
  x: number;
  y: number;
}

export interface DiagramEdge {
  from: string;
  to: string;
  status: EdgeStatus;
  label?: Localized;
}

export interface ArchitectureDiagram {
  title: Localized;
  width: number;
  height: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export const NODE_SIZE = { width: 150, height: 64 } as const;

interface Point {
  x: number;
  y: number;
}

const center = (node: DiagramNode): Point => ({
  x: node.x + NODE_SIZE.width / 2,
  y: node.y + NODE_SIZE.height / 2,
});

/** Where the line from the box's centre towards `target` leaves the box. */
export function exitPoint(node: DiagramNode, target: Point): Point {
  const from = center(node);
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  if (dx === 0 && dy === 0) return from;
  const scale = Math.min(
    dx === 0 ? Infinity : NODE_SIZE.width / 2 / Math.abs(dx),
    dy === 0 ? Infinity : NODE_SIZE.height / 2 / Math.abs(dy),
  );
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

/** Straight line between two boxes, from border to border. */
export function edgeLine(from: DiagramNode, to: DiagramNode): { start: Point; end: Point } {
  return { start: exitPoint(from, center(to)), end: exitPoint(to, center(from)) };
}

/**
 * KRITIS GRC as described in its ADRs: the SPA calls Django on the same origin via Vercel
 * rewrites; Django owns all data, FastAPI is a stateless risk engine. Today only the SPA with
 * in-browser demo data (MSW) is live.
 */
export const KRITIS_ARCHITECTURE: ArchitectureDiagram = {
  title: { de: 'Architektur von KRITIS GRC', en: 'KRITIS GRC architecture' },
  width: 800,
  height: 360,
  nodes: [
    {
      id: 'browser',
      label: { de: 'Browser', en: 'Browser' },
      detail: { de: 'Nutzer', en: 'User' },
      status: 'live',
      x: 20,
      y: 148,
    },
    {
      id: 'spa',
      label: { de: 'React-SPA', en: 'React SPA' },
      detail: { de: 'auf Vercel', en: 'on Vercel' },
      status: 'live',
      x: 230,
      y: 148,
    },
    {
      id: 'msw',
      label: { de: 'Demodaten', en: 'Demo data' },
      detail: { de: 'MSW, im Browser', en: 'MSW, in the browser' },
      status: 'live',
      x: 230,
      y: 276,
    },
    {
      id: 'django',
      label: { de: 'Django-API', en: 'Django API' },
      detail: { de: 'Modularer Monolith', en: 'Modular monolith' },
      status: 'skeleton',
      x: 440,
      y: 148,
    },
    {
      id: 'fastapi',
      label: { de: 'FastAPI', en: 'FastAPI' },
      detail: { de: 'Risk Engine', en: 'Risk engine' },
      status: 'skeleton',
      x: 630,
      y: 28,
    },
    {
      id: 'postgres',
      label: { de: 'PostgreSQL', en: 'PostgreSQL' },
      detail: { de: 'Supabase, EU', en: 'Supabase, EU' },
      status: 'planned',
      x: 630,
      y: 148,
    },
    {
      id: 'storage',
      label: { de: 'Objektspeicher', en: 'Object storage' },
      detail: { de: 'Cloudflare R2', en: 'Cloudflare R2' },
      status: 'planned',
      x: 630,
      y: 268,
    },
  ],
  edges: [
    { from: 'browser', to: 'spa', status: 'live' },
    { from: 'spa', to: 'msw', status: 'live' },
    { from: 'spa', to: 'django', status: 'planned', label: { de: '/api', en: '/api' } },
    { from: 'django', to: 'fastapi', status: 'planned' },
    { from: 'django', to: 'postgres', status: 'planned' },
    { from: 'django', to: 'storage', status: 'planned' },
  ],
};

/**
 * FlowPro as its compose file runs it: Caddy terminates TLS, serves the SPA and proxies /api
 * to the API; API and worker share one PostgreSQL that isolates tenants with row-level
 * security. Everything here runs today.
 */
export const FLOWPRO_ARCHITECTURE: ArchitectureDiagram = {
  title: { de: 'Architektur von FlowPro', en: 'FlowPro architecture' },
  width: 800,
  height: 260,
  nodes: [
    {
      id: 'browser',
      label: { de: 'Browser', en: 'Browser' },
      detail: { de: 'React-SPA, IndexedDB', en: 'React SPA, IndexedDB' },
      status: 'live',
      x: 20,
      y: 78,
    },
    {
      id: 'caddy',
      label: { de: 'Caddy', en: 'Caddy' },
      detail: { de: 'TLS, Reverse Proxy', en: 'TLS, reverse proxy' },
      status: 'live',
      x: 230,
      y: 78,
    },
    {
      id: 'api',
      label: { de: 'ASP.NET-API', en: 'ASP.NET API' },
      detail: { de: 'Modularer Monolith', en: 'Modular monolith' },
      status: 'live',
      x: 440,
      y: 20,
    },
    {
      id: 'worker',
      label: { de: 'Worker', en: 'Worker' },
      detail: { de: 'Outbox-Versand', en: 'Outbox dispatch' },
      status: 'live',
      x: 440,
      y: 176,
    },
    {
      id: 'postgres',
      label: { de: 'PostgreSQL', en: 'PostgreSQL' },
      detail: { de: 'Row-Level Security', en: 'Row-level security' },
      status: 'live',
      x: 630,
      y: 98,
    },
  ],
  edges: [
    { from: 'browser', to: 'caddy', status: 'live', label: { de: 'HTTPS', en: 'HTTPS' } },
    { from: 'caddy', to: 'api', status: 'live', label: { de: '/api', en: '/api' } },
    { from: 'api', to: 'postgres', status: 'live' },
    { from: 'worker', to: 'postgres', status: 'live' },
  ],
};

export const DIAGRAMS: Readonly<Record<string, ArchitectureDiagram>> = {
  'kritis-grc': KRITIS_ARCHITECTURE,
  flowpro: FLOWPRO_ARCHITECTURE,
};
