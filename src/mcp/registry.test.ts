import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GET as getAuthProof } from '@/pages/.well-known/mcp-registry-auth';
import { serverCard } from './discovery';
import { REGISTRY_PUBLIC_KEY, REGISTRY_SCHEMA, registryServer } from './registry';

describe('registryServer', () => {
  it('describes the remote server as the Server Card does', () => {
    const entry = registryServer();
    const card = serverCard();

    expect(entry.$schema).toBe(REGISTRY_SCHEMA);
    expect(entry).toMatchObject({
      name: 'online.inomov/portfolio',
      version: card.version,
      title: card.title,
      description: card.description,
      websiteUrl: card.websiteUrl,
      repository: card.repository,
      remotes: [{ type: 'streamable-http', url: 'https://inomov.online/api/mcp' }],
    });
  });

  it('keeps within the registry schema', () => {
    const entry = registryServer();

    expect(entry.name).toMatch(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
    expect(entry.description.length).toBeLessThanOrEqual(100);
    expect(entry.title.length).toBeLessThanOrEqual(100);
    for (const icon of entry.icons) {
      expect(icon.src).toMatch(/^https:\/\//);
      expect(['image/png', 'image/svg+xml']).toContain(icon.mimeType);
      for (const size of icon.sizes) expect(size).toMatch(/^(\d+x\d+|any)$/);
    }
    expect(entry.icons.map((icon) => icon.mimeType)).toContain('image/png');
  });

  it('matches the committed server.json; run `pnpm mcp:server-json` after a change', () => {
    const committed: unknown = JSON.parse(readFileSync('server.json', 'utf8'));

    expect(committed).toEqual(registryServer());
  });
});

describe('registry ownership proof', () => {
  it('holds a 32-byte Ed25519 public key', () => {
    expect(Buffer.from(REGISTRY_PUBLIC_KEY, 'base64')).toHaveLength(32);
  });

  it('serves the proof in the format the registry reads', async () => {
    const response = await getAuthProof({} as never);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(`v=MCPv1; k=ed25519; p=${REGISTRY_PUBLIC_KEY}\n`);
  });
});
