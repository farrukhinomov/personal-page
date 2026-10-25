# Astro static site, Vercel functions for the API, Cal.com for booking

The Portfolio is built with Astro and rendered to static HTML. The only server code is Vercel serverless functions under `/api/*`: the MCP endpoint, `resume.json` and booking. We chose this over Next.js because the site is mostly content, and static output with almost no client JS gives the best speed and SEO. GSAP runs only in small client scripts. Intro Call booking goes through the Cal.com API rather than our own Google Calendar integration, because Cal.com already handles time zones, confirmations and approval.

## Considered Options

- **Next.js**: it can do everything, but it ships far more JS and suits app-like sites better.
- **Plain Vite SPA**: rejected because client-rendered content is weak for SEO and for Agents that read HTML.
- **Own Google Calendar booking**: rejected because it means more code, OAuth token handling and edge cases we'd have to own.
