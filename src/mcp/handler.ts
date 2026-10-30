import { createMcpHandler, originValidationResponse } from '@modelcontextprotocol/server';
import type { Localized } from '@/i18n/locales';
import { SITE_URL } from '@/seo/structured-data';
import { readLimited } from '@/server/request';
import type { McpPost } from './catalog';
import { MCP_TOOLS } from './discovery';
import { createPortfolioServer } from './server';
import type { ToolName } from './tool-info';
import type { WriteServices } from './write-tools';

/** The largest call is a Message of 5000 characters; nothing legitimate comes near this. */
const MAX_REQUEST_BYTES = 64 * 1024;

/**
 * Carries the caller's address to the per-request server. The SDK may clone the Request on its way
 * to the factory, which keeps headers; any value a client sends is overwritten.
 */
const CLIENT_IP_HEADER = 'x-portfolio-client-ip';

/** The daily health check names itself with this User-Agent; its calls are not usage. */
export const HEALTH_CHECK_AGENT = 'inomov-health-check';

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
  const handler = createMcpHandler(
    async ({ requestInfo }) => {
      const ip = requestInfo?.headers.get(CLIENT_IP_HEADER) ?? '';
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
      const headers = new Headers(request.headers);
      headers.set(CLIENT_IP_HEADER, ip);
      const tool = await calledTool(request);
      const response = await handler.fetch(new Request(request, { headers }));
      if (tool) await services.count(`mcp:${tool}`);
      return response;
    },
  };
}

/**
 * The tool a request calls, for the weekly summary. It reads a copy, so the SDK still gets the
 * body, and stops at the SDK's size limit, past which the SDK refuses the request anyway.
 */
async function calledTool(request: Request): Promise<ToolName | undefined> {
  if (request.method !== 'POST') return undefined;
  if (request.headers.get('User-Agent') === HEALTH_CHECK_AGENT) return undefined;
  try {
    const raw = await readLimited(request.clone(), MAX_REQUEST_BYTES);
    if (!raw) return undefined;
    const body = JSON.parse(new TextDecoder().decode(raw)) as {
      method?: unknown;
      params?: { name?: unknown };
    };
    const name = body.method === 'tools/call' ? body.params?.name : undefined;
    return MCP_TOOLS.find((tool) => tool === name);
  } catch {
    // Not JSON-RPC: the SDK answers with the error.
    return undefined;
  }
}
