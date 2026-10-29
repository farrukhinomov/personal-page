import { SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/server';
import { pathFor } from '@/i18n/routes';
import { SITE_URL } from '@/seo/structured-data';

/**
 * How Agents find the MCP endpoint without being told: an AI Catalog at the site's well-known
 * URI points to the endpoint's Server Card (MCP SEP-2127), which says where and how to connect.
 * Both are public, read-only metadata.
 */

export const MCP_ENDPOINT_PATH = '/api/mcp';
/** The location MCP reserves for a Server Card: the Streamable HTTP URL plus `/server-card`. */
export const SERVER_CARD_PATH = `${MCP_ENDPOINT_PATH}/server-card`;
export const AI_CATALOG_PATH = '/.well-known/ai-catalog.json';

export const SERVER_CARD_TYPE = 'application/mcp-server-card+json';
export const AI_CATALOG_TYPE = 'application/ai-catalog+json';

/** Reverse-DNS name of the server, the same in the Server Card and in `serverInfo`. */
export const SERVER_NAME = 'online.inomov/portfolio';
export const SERVER_VERSION = '1.1.0';

/** The revision of the specification the SDK serves next to the 2025-era ones it lists. */
const MODERN_PROTOCOL_VERSION = '2026-07-28';
export const PROTOCOL_VERSIONS = [MODERN_PROTOCOL_VERSION, ...SUPPORTED_PROTOCOL_VERSIONS];

/** The tools in the order the server registers them; a test keeps both in step. */
export const MCP_TOOLS = [
  'get_profile',
  'get_experience',
  'get_skills',
  'list_projects',
  'get_project',
  'list_posts',
  'get_post',
  'get_available_slots',
  'send_message',
  'book_call',
] as const;

const absolute = (path: string) => new URL(path, SITE_URL).href;

export const MCP_ENDPOINT_URL = absolute(MCP_ENDPOINT_PATH);

/** The Server Card, in the v1 format of the MCP Server Card extension. */
export function serverCard() {
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    name: SERVER_NAME,
    version: SERVER_VERSION,
    title: 'Farrukh Inomov',
    description:
      "Farrukh Inomov's portfolio: profile, experience, projects, blog, messages and intro calls.",
    websiteUrl: absolute(pathFor('home', 'en')),
    repository: { url: 'https://github.com/farrukhinomov/personal-page', source: 'github' },
    icons: [{ src: absolute('/favicon.svg'), mimeType: 'image/svg+xml', sizes: ['any'] }],
    remotes: [
      {
        type: 'streamable-http',
        url: MCP_ENDPOINT_URL,
        supportedProtocolVersions: PROTOCOL_VERSIONS,
      },
    ],
  };
}

/** The site's AI Catalog: one entry, pointing to the Server Card. */
export function aiCatalog() {
  return {
    specVersion: '1.0',
    host: {
      displayName: 'Farrukh Inomov',
      identifier: new URL(SITE_URL).hostname,
      documentationUrl: absolute(pathFor('home', 'en')),
    },
    entries: [
      {
        identifier: `urn:air:${new URL(SITE_URL).hostname}:mcp:portfolio`,
        type: SERVER_CARD_TYPE,
        url: absolute(SERVER_CARD_PATH),
      },
    ],
  };
}

/** Public, read-only metadata: any site may read it, and it changes only with a deployment. */
export function discoveryResponse(body: unknown, type: string): Response {
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
      'Access-Control-Expose-Headers': 'ETag',
    },
  });
}
