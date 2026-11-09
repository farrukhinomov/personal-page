import type { APIRoute } from 'astro';
import { registryAuthProof } from '@/mcp/registry';

/** Served by a function: the file has no extension, so its media type comes from this code. */
export const prerender = false;

/** The MCP Registry's HTTP proof that this domain owns the `online.inomov/*` namespace. */
export const GET: APIRoute = () =>
  new Response(registryAuthProof(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
