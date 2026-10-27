# inomov.online

Farrukh Inomov's hiring portfolio, in German (default, `/`) and English (`/en`).
Built with [Astro](https://astro.build) as static HTML and deployed on Vercel.

## Develop

Requires Node 24 (see `.nvmrc`) and pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm verify     # lint, format check, tests, type check and build
```

## End-to-end tests

Playwright runs against the production build (`pnpm build` first), in Chromium, Firefox and WebKit:
every page from the sitemap, axe checks for WCAG 2.2 AA in both themes, and the terminal, menu,
theme toggle, language switch and scroll motion.

```bash
pnpm exec playwright install   # once, downloads the browsers
pnpm test:e2e                  # all browsers
pnpm test:visual               # screenshots, in Docker (see below)
pnpm test:visual --update-snapshots   # after an intended visual change
```

Screenshots render differently on each operating system, so the visual tests only run on Linux,
in the official Playwright image: in CI and locally through `pnpm test:visual`, which needs Docker.
Review the changed images in `e2e/__screenshots__/` before committing them.

## Where things live

| Path              | What                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `src/data/`       | Single source of truth: profile, Experience, Skills, Projects. Validated with Zod at build time. |
| `src/i18n/`       | Locales, translated routes and UI strings.                                                       |
| `src/views/`      | One component per page, shared by both locales. `src/pages/` only maps URLs to views.            |
| `src/components/` | Components grouped by surface (`site`, `home`, `about`, `projects`, `ui`).                       |
| `src/styles/`     | Design tokens and global styles.                                                                 |
| `e2e/`            | Playwright end-to-end, accessibility and visual tests.                                           |
| `GLOSSARY.md`     | The domain language. Use these terms in code and copy.                                           |
| `docs/adr/`       | Architecture decisions.                                                                          |

## Deploy

Vercel builds every push. Pull requests get preview deployments; `master` goes to https://inomov.online.
