/**
 * Writes server.json, this server's entry in the official MCP Registry, from src/mcp/registry.ts.
 *
 * Usage: pnpm mcp:server-json
 *
 * Run it after changing the Server Card; src/mcp/registry.test.ts fails until the file matches.
 */
import { writeFileSync } from 'node:fs';
import { registryServer } from '@/mcp/registry';

writeFileSync('server.json', `${JSON.stringify(registryServer(), null, 2)}\n`);
process.stdout.write('Wrote server.json\n');
