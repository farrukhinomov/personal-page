# MCP write tools without Turnstile, with caps for all assistants

Agents can send Farrukh a Message (`send_message`) and request an Intro Call (`get_available_slots`, `book_call`) through `/api/mcp`. They validate input with the same schemas as the Contact page forms and use the same delivery: Resend for Messages, the shared `requestIntroCall` for bookings, which checks the Slot with Cal.com again before booking it, and Farrukh approves every call.

An agent cannot solve Cloudflare Turnstile, so the forms' bot check is replaced by limits. Each IP may send 3 Messages and 3 bookings per day; the booking count is the same counter as the Contact page form's, so one IP gets 3 bookings across both. Assistants of one provider (such as ChatGPT or Claude connectors) often share IP addresses, so per-IP limits alone neither protect well nor stay fair. On top of them, a cap counts all assistants together: 20 Messages and 10 bookings per day. Messages from an agent get no confirmation email, because an agent could name any address and the site would email a stranger; the agent's user sees the confirmation in the chat. Bookings still get Cal.com's emails, so an agent can have Cal.com write to any address; the daily cap bounds that to 10 emails, and a time that is not offered is refused before it counts. Notifications and bookings are marked as coming from an AI assistant, with name and email unconfirmed.

Without Turnstile behind them, the limits only MCP uses fail closed: while Redis is unreachable, `send_message` and `book_call` refuse and point to the Contact page, whereas the forms let requests through. Without a known client address, they refuse too.

## Considered Options

- **Turnstile token as a tool argument**: an agent has no browser to solve it in.
- **OAuth for the MCP endpoint**: it would identify the client, not the person, and would ask every Visitor's assistant to sign up first.
- **Confirmation emails as on the form**: they would turn the tool into a way to send mail to any address.
