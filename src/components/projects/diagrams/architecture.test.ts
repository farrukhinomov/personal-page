import { describe, expect, it } from 'vitest';
import {
  DIAGRAMS,
  edgeLine,
  exitPoint,
  FLOWPRO_ARCHITECTURE,
  KRITIS_ARCHITECTURE,
  NODE_SIZE,
} from './architecture';

const node = (x: number, y: number) => ({
  id: 'n',
  label: { de: 'n', en: 'n' },
  detail: { de: '', en: '' },
  status: 'live' as const,
  x,
  y,
});

describe('diagram geometry', () => {
  it('leaves a box through its right edge towards a target on the right', () => {
    expect(exitPoint(node(0, 0), { x: 500, y: NODE_SIZE.height / 2 })).toEqual({
      x: NODE_SIZE.width,
      y: NODE_SIZE.height / 2,
    });
  });

  it('leaves through the bottom edge towards a target below', () => {
    expect(exitPoint(node(0, 0), { x: NODE_SIZE.width / 2, y: 500 })).toEqual({
      x: NODE_SIZE.width / 2,
      y: NODE_SIZE.height,
    });
  });

  it('draws edges border to border, never through a box', () => {
    const { start, end } = edgeLine(node(0, 0), node(300, 0));
    expect(start.x).toBe(NODE_SIZE.width);
    expect(end.x).toBe(300);
  });
});

describe('KRITIS GRC architecture', () => {
  const { nodes, edges } = KRITIS_ARCHITECTURE;
  const ids = new Set(nodes.map((n) => n.id));

  it('only connects nodes that exist', () => {
    for (const edge of edges) {
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to)).toBe(true);
    }
  });

  it('marks only browser → SPA → demo data as working today', () => {
    const live = edges.filter((e) => e.status === 'live').map((e) => `${e.from}>${e.to}`);
    expect(live).toEqual(['browser>spa', 'spa>msw']);
    expect(nodes.filter((n) => n.status === 'live').map((n) => n.id)).toEqual([
      'browser',
      'spa',
      'msw',
    ]);
  });

  it('keeps every box inside the drawing', () => {
    for (const n of nodes) {
      expect(n.x + NODE_SIZE.width).toBeLessThanOrEqual(KRITIS_ARCHITECTURE.width);
      expect(n.y + NODE_SIZE.height).toBeLessThanOrEqual(KRITIS_ARCHITECTURE.height);
    }
  });

  it('is registered for the kritis-grc project', () => {
    expect(DIAGRAMS['kritis-grc']).toBe(KRITIS_ARCHITECTURE);
  });
});

describe('FlowPro architecture', () => {
  const { nodes, edges } = FLOWPRO_ARCHITECTURE;
  const ids = new Set(nodes.map((n) => n.id));

  it('only connects nodes that exist', () => {
    for (const edge of edges) {
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to)).toBe(true);
    }
  });

  it('shows only what runs today', () => {
    expect([...nodes, ...edges].every((item) => item.status === 'live')).toBe(true);
  });

  it('keeps every box inside the drawing', () => {
    for (const n of nodes) {
      expect(n.x + NODE_SIZE.width).toBeLessThanOrEqual(FLOWPRO_ARCHITECTURE.width);
      expect(n.y + NODE_SIZE.height).toBeLessThanOrEqual(FLOWPRO_ARCHITECTURE.height);
    }
  });

  it('is registered for the flowpro project', () => {
    expect(DIAGRAMS.flowpro).toBe(FLOWPRO_ARCHITECTURE);
  });
});

describe('every diagram', () => {
  // About 6 px per character at the detail font size; the box leaves ~128 px for text.
  const MAX_DETAIL_LENGTH = 21;

  it('keeps node details short enough to stay inside their box', () => {
    for (const diagram of Object.values(DIAGRAMS)) {
      for (const node of diagram.nodes) {
        for (const text of Object.values(node.detail)) {
          expect(text.length, text).toBeLessThanOrEqual(MAX_DETAIL_LENGTH);
        }
      }
    }
  });
});
