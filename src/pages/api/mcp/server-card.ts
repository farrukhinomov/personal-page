import type { APIRoute } from 'astro';
import { discoveryResponse, SERVER_CARD_TYPE, serverCard } from '@/mcp/discovery';

/** Served by a function so its media type and CORS headers come from this code; the CDN caches it. */
export const prerender = false;

/** The MCP Server Card (SEP-2127) at the location MCP reserves for it (issue #9). */
export const GET: APIRoute = () => discoveryResponse(serverCard(), SERVER_CARD_TYPE);
