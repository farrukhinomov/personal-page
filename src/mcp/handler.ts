import { createMcpHandler, originValidationResponse } from '@modelcontextprotocol/server';
import type { Localized } from '@/i18n/locales';
import { SITE_URL } from '@/seo/structured-data';
import type { McpPost } from './catalog';
import { createPortfolioServer } from './server';

/** Tool arguments are a language and a slug; nothing legitimate comes near this. */
const MAX_REQUEST_BYTES = 64 * 1024;

/** Browsers may call the endpoint from the site itself; other clients send no Origin. */
const ALLOWED_ORIGINS = [new URL(SITE_URL).hostname];

export interface PortfolioMcpHandler {
  fetch(request: Request): Promise<Response>;
}

/**
 * The Streamable HTTP endpoint at /api/mcp. Stateless: every request gets a fresh server, so it
 * runs as a plain serverless function, and 2025-era clients are served the same way.
 *
 * A request with an Origin header from another site is refused, as the MCP specification asks,
 * so no web page can use a Visitor's browser to call the tools.
 */
export function createPortfolioMcpHandler(
  loadPosts: () => Promise<Localized<readonly McpPost[]>>,
): PortfolioMcpHandler {
  const handler = createMcpHandler(async () => createPortfolioServer(await loadPosts()), {
    responseMode: 'json',
    maxRequestBodySize: MAX_REQUEST_BYTES,
    onerror: (error) => console.error('MCP request failed.', error),
  });
  return {
    fetch: async (request) =>
      originValidationResponse(request, ALLOWED_ORIGINS) ?? handler.fetch(request),
  };
}
