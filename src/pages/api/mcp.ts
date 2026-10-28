import type { APIRoute } from 'astro';
import { createPortfolioMcpHandler } from '@/mcp/handler';
import { loadMcpPosts } from '@/mcp/posts';

/** Runs as a Vercel function; every other page is static. */
export const prerender = false;

const handler = createPortfolioMcpHandler(loadMcpPosts);

/** The MCP endpoint for Agents (issue #7); the MCP SDK answers every method itself. */
export const ALL: APIRoute = ({ request }) => handler.fetch(request);
