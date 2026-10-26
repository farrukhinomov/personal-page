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

## Where things live

| Path              | What                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `src/data/`       | Single source of truth: profile, Experience, Skills, Projects. Validated with Zod at build time. |
| `src/i18n/`       | Locales, translated routes and UI strings.                                                       |
| `src/views/`      | One component per page, shared by both locales. `src/pages/` only maps URLs to views.            |
| `src/components/` | Components grouped by surface (`site`, `home`, `about`, `projects`, `ui`).                       |
| `src/styles/`     | Design tokens and global styles.                                                                 |
| `GLOSSARY.md`     | The domain language. Use these terms in code and copy.                                           |
| `docs/adr/`       | Architecture decisions.                                                                          |

## Deploy

Vercel builds every push. Pull requests get preview deployments; `master` goes to https://inomov.online.
