# Stateless MCP endpoint with the official v2 SDK

Agents reach the Portfolio at `/api/mcp`, a Streamable HTTP endpoint built with `createMcpHandler` from the official TypeScript SDK v2 (`@modelcontextprotocol/server`). Every request gets a fresh server from a factory and nothing is kept between requests, so the endpoint runs as an ordinary Vercel function. The same factory answers clients that speak the 2026-07-28 revision and 2025-era clients, which most hosts still are. The tools read the same data modules and blog collection as the pages, so an Agent sees what a Visitor sees.

The read-only tools have no limit in the application: they return public data, like the pages. Floods are stopped before the function runs by a Vercel firewall rule, "Rate limit MCP endpoint": at most 120 requests per minute per IP to `/api/mcp`, answered with HTTP 429 beyond that. Agents of one provider can share an IP, so the limit sits far above one conversation. The rule lives in the Vercel project, not in this repository (`vercel firewall rules list`). Tools that reach Farrukh's inbox or calendar get the Upstash limits like the forms. A request with an `Origin` header from another site is refused, as the specification requires, so no web page can use a Visitor's browser to call the tools; server-side clients send no `Origin` and pass.

## Considered Options

- **SDK v1 (`@modelcontextprotocol/sdk`)**: still maintained, but only with fixes; v2 is the stable line and implements the current revision.
- **Sessions with a store (Redis)**: needed only for server-initiated messages and resumable streams, which read-only tools do not use. It would add state and cost to every connection.
- **The `mcp-handler` package from Vercel**: a thin wrapper over v1; the official SDK now serves web-standard `Request`s itself.
