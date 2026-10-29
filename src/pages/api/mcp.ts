import type { APIRoute } from 'astro';
import { createPortfolioMcpHandler } from '@/mcp/handler';
import { loadMcpPosts } from '@/mcp/posts';
import { cacheFor } from '@/mcp/cache';
import { bookingWindow } from '@/server/booking-handler';
import { createBooking, fetchSlots } from '@/server/calcom';
import { sendEmail } from '@/server/message-mail';
import { requiredSecret } from '@/server/secrets';
import { rateLimit } from '@/server/upstash';

/** Runs as a Vercel function; every other page is static. */
export const prerender = false;

/** The same short cache the Contact page's Slots get from the CDN. */
const SLOTS_CACHE_MS = 60_000;

const handler = createPortfolioMcpHandler({
  loadPosts: () => loadMcpPosts(new Date(__BUILT_AT__)),
  // Secrets are read when a write tool runs, so the read-only tools work without them.
  services: {
    rateLimit,
    send: (email) => sendEmail(requiredSecret('RESEND_API_KEY'), email),
    listSlots: cacheFor(SLOTS_CACHE_MS, () =>
      fetchSlots(requiredSecret('CALCOM_API_KEY'), bookingWindow(new Date())),
    ),
    slots: (range) => fetchSlots(requiredSecret('CALCOM_API_KEY'), range),
    book: (booking) => createBooking(requiredSecret('CALCOM_API_KEY'), booking),
  },
});

/** The MCP endpoint for Agents (issues #7 and #12); the MCP SDK answers every method itself. */
export const ALL: APIRoute = ({ request, clientAddress }) => handler.fetch(request, clientAddress);
