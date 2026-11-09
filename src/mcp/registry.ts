import { SITE_URL } from '@/seo/structured-data';
import { serverCard } from './discovery';

/**
 * The entry of this server in the official MCP Registry (registry.modelcontextprotocol.io).
 * It repeats the Server Card, so `server.json` is generated from it and a test keeps the two in
 * step; publishing runs by hand in .github/workflows/mcp-registry.yml.
 */

export const REGISTRY_SCHEMA =
  'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json';

/** The registry proves ownership of `online.inomov/*` by fetching this file from the domain. */
export const REGISTRY_AUTH_PATH = '/.well-known/mcp-registry-auth';

/**
 * Public half of the Ed25519 key pair whose private half signs in to the registry (repository
 * secret MCP_REGISTRY_PRIVATE_KEY). Public by design; replacing the pair means changing this.
 */
export const REGISTRY_PUBLIC_KEY = '47rOFyWPPs8ftXu6N+7Nw675S7qNvCkBnWYQU2CSPko=';

export function registryAuthProof(): string {
  return `v=MCPv1; k=ed25519; p=${REGISTRY_PUBLIC_KEY}\n`;
}

export function registryServer() {
  const { name, version, title, description, websiteUrl, repository, icons, remotes } =
    serverCard();
  return {
    $schema: REGISTRY_SCHEMA,
    name,
    version,
    title,
    description,
    websiteUrl,
    repository,
    // Clients must support PNG; the SVG stays first for those that render it.
    icons: [
      ...icons,
      {
        src: new URL('/apple-touch-icon.png', SITE_URL).href,
        mimeType: 'image/png',
        sizes: ['180x180'],
      },
    ],
    // The registry's transport has no field for protocol versions; the Server Card keeps them.
    remotes: remotes.map(({ type, url }) => ({ type, url })),
  };
}
