import type { APIRoute } from 'astro';
import { AI_CATALOG_TYPE, aiCatalog, discoveryResponse } from '@/mcp/discovery';

/** Served by a function so its media type and CORS headers come from this code; the CDN caches it. */
export const prerender = false;

/** The site's AI Catalog at its well-known URI, pointing Agents to the MCP Server Card (issue #9). */
export const GET: APIRoute = () => discoveryResponse(aiCatalog(), AI_CATALOG_TYPE);
