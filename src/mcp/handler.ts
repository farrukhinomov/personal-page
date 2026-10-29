import { createMcpHandler, originValidationResponse } from '@modelcontextprotocol/server';
import type { Localized } from '@/i18n/locales';
import { SITE_URL } from '@/seo/structured-data';
import type { McpPost } from './catalog';
import { createPortfolioServer } from './server';
import type { WriteServices } from './write-tools';

/** The largest call is a Message of 5000 characters; nothing legitimate comes near this. */
const MAX_REQUEST_BYTES = 64 * 1024;

/** Browsers may call the endpoint from the site itself; other clients send no Origin. */
const ALLOWED_ORIGINS = [new URL(SITE_URL).hostname];

export interface PortfolioMcpHandler {
  /** Serves one request; `ip` is the caller's address, which the write tools' limits count. */
  fetch(request: Request, ip: string): Promise<Response>;
}

export interface PortfolioMcpOptions {
  loadPosts(): Promise<Localized<readonly McpPost[]>>;
  services: Omit<WriteServices, 'ip'>;
}

/**
 * The Streamable HTTP endpoint at /api/mcp. Stateless: every request gets a fresh server, so it
 * runs as a plain serverless function, and 2025-era clients are served the same way.
 *
 * A request with an Origin header from another site is refused, as the MCP specification asks,
 * so no web page can use a Visitor's browser to call the tools.
 *
 * The Posts are bundled with the deployment and cannot change while it runs, so they are loaded
 * once per function instance; a failed load is tried again on the next request.
 */
export function createPortfolioMcpHandler({
  loadPosts,
  services,
}: PortfolioMcpOptions): PortfolioMcpHandler {
  let posts: Promise<Localized<readonly McpPost[]>> | undefined;
  const loadOnce = () => {
    posts ??= loadPosts().catch((error: unknown) => {
      posts = undefined;
      throw error;
    });
    return posts;
  };
  // The SDK hands the factory the Request it was given, which carries no client address.
  const callers = new WeakMap<Request, string>();
  const handler = createMcpHandler(
    async ({ requestInfo }) => {
      const ip = (requestInfo && callers.get(requestInfo)) ?? '';
      return createPortfolioServer(await loadOnce(), { ...services, ip });
    },
    {
      responseMode: 'json',
      maxRequestBodySize: MAX_REQUEST_BYTES,
      onerror: (error) => console.error('MCP request failed.', error),
    },
  );
  return {
    fetch: async (request, ip) => {
      const refused = originValidationResponse(request, ALLOWED_ORIGINS);
      if (refused) return refused;
      callers.set(request, ip);
      return handler.fetch(request);
    },
  };
}
