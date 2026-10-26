import { projectsSchema } from './schema';

/** Ordered by how prominently they are shown. */
export const projects = projectsSchema.parse([
  {
    slug: 'kritis-grc',
    name: 'KRITIS GRC',
    kind: { de: 'GRC-SaaS-Prototyp', en: 'GRC SaaS prototype' },
    repository: 'farrukhinomov/kritis-grc',
    visibility: 'public',
    homepage: 'https://grc.inomov.online',
    tagline: {
      de: 'GRC-Plattform für Betreiber kritischer Anlagen nach KRITIS-Dachgesetz und NIS2 – als klickbarer Prototyp.',
      en: 'GRC platform for operators of critical facilities under the KRITIS umbrella act and NIS2 – as a clickable prototype.',
    },
    description: {
      de: 'Eigenständiges Entwicklungsprojekt für eine mandantenfähige Governance-, Risk- und Compliance-Plattform im Kontext von KRITIS-Dachgesetz und NIS2. Der klickbare React/TypeScript-Frontend-Prototyp ist umgesetzt und nutzt fiktive Demodaten. Die Backend-Anbindung und persistente Speicherung mit Python/Django und FastAPI werden schrittweise entwickelt.',
      en: 'An independent development project for a multi-tenant governance, risk and compliance platform in the context of the KRITIS umbrella act and NIS2. The clickable React/TypeScript frontend prototype is built and uses fictional demo data. The backend connection and persistent storage with Python/Django and FastAPI are being developed step by step.',
    },
    stack: ['React', 'TypeScript', 'Django', 'FastAPI', 'Ant Design', 'PostgreSQL', 'Docker'],
    year: 2026,
    featured: true,
    sections: [
      {
        heading: { de: 'Umgesetzt', en: 'Implemented' },
        items: [
          {
            de: 'React-SPA mit TypeScript im Strict Mode und Ant Design',
            en: 'React SPA with TypeScript in strict mode and Ant Design',
          },
          {
            de: 'Responsive Oberfläche für Desktop, Tablet und Smartphone',
            en: 'Responsive UI for desktop, tablet and phone',
          },
          {
            de: 'Demo-Abläufe auf fiktiven Daten: vom Gesetzesparagrafen über die Anforderung zur Umsetzung mit Nachweis, Risikobewertung mit Restrisiko in der Matrix',
            en: 'Demo workflows on fictional data: from legal paragraph to requirement to implementation with evidence, and risk assessment with the residual risk in the matrix',
          },
          {
            de: 'Rollen GRC-Manager und Auditor (nur lesend)',
            en: 'Roles: GRC manager and auditor (read-only)',
          },
        ],
      },
      {
        heading: { de: 'Qualität', en: 'Quality' },
        items: [
          {
            de: 'Unit-Tests mit Vitest und einer Mindestabdeckung von 80 %',
            en: 'Unit tests with Vitest and a minimum coverage of 80%',
          },
          { de: 'Typprüfung und Linting in der CI', en: 'Type checks and linting in CI' },
          { de: 'End-to-End-Tests mit Playwright', en: 'End-to-end tests with Playwright' },
          {
            de: 'Automatisierte Barrierefreiheitsprüfung mit axe',
            en: 'Automated accessibility checks with axe',
          },
          {
            de: 'Visuelle Regressionstests für Desktop und Smartphone',
            en: 'Visual regression tests for desktop and phone',
          },
        ],
      },
      {
        heading: { de: 'Architektur und Arbeitsweise', en: 'Architecture and way of working' },
        items: [
          {
            de: 'Über 20 Architekturentscheidungen als ADRs dokumentiert',
            en: 'More than 20 architecture decisions recorded as ADRs',
          },
          {
            de: 'Scope mit Meilensteinen, Konventionen und Glossar',
            en: 'Scope with milestones, conventions and a glossary',
          },
          {
            de: 'User Stories mit Akzeptanzkriterien, ein Pull Request pro Issue',
            en: 'User stories with acceptance criteria, one pull request per issue',
          },
          {
            de: 'Anweisungen für KI-Coding-Assistenten und ein KI-Protokoll im Repository',
            en: 'Instructions for AI coding assistants and an AI log in the repository',
          },
        ],
      },
      {
        heading: { de: 'Aktueller Stand', en: 'Current status' },
        items: [
          {
            de: 'Fertig: der klickbare Prototyp auf Demodaten (Meilenstein P)',
            en: 'Done: the clickable prototype on demo data (milestone P)',
          },
          {
            de: 'In Arbeit: das Walking Skeleton (M0) – Django- und FastAPI-Dienste mit Health-Checks und CI/CD',
            en: 'In progress: the walking skeleton (M0) – Django and FastAPI services with health checks and CI/CD',
          },
          {
            de: 'Als Nächstes: der Compliance-Kern (M1) – die echte API hinter dem Hauptablauf mit Login, Mandanten, Umsetzungen und Nachweisen',
            en: 'Next: the compliance core (M1) – the real API behind the main flow, with login, tenants, implementations and evidence',
          },
        ],
      },
    ],
    sectionsUpdated: '2026-10-26',
  },
  {
    slug: 'inomov-online',
    name: 'inomov.online',
    repository: 'farrukhinomov/personal-page',
    visibility: 'public',
    homepage: 'https://inomov.online',
    tagline: {
      de: 'Dieses Portfolio: zweisprachig, statisch und für Menschen und KI-Agenten gebaut.',
      en: 'This portfolio: bilingual, static, and built for people and AI agents.',
    },
    description: {
      de: 'Die Website, die Sie gerade lesen. Statisch mit Astro gebaut, zweisprachig mit erzwungenen Übersetzungen und einer strengen Content Security Policy. Dazu ein Terminal auf der Startseite sowie JSON-LD, llms.txt und JSON Resume für Suchmaschinen und KI-Agenten. Alle Inhalte stehen genau einmal als geprüfte Daten im Repository.',
      en: 'The website you are reading. Built static with Astro, bilingual with enforced translations and a strict Content Security Policy. It adds a terminal on the start page, plus JSON-LD, llms.txt and JSON Resume for search engines and AI agents. All content lives exactly once as validated data in the repository.',
    },
    stack: ['Astro', 'TypeScript', 'MDX', 'GSAP', 'Zod', 'Vitest', 'Vercel'],
    year: 2026,
    featured: false,
  },
  {
    slug: 'flowpro',
    name: 'FlowPro',
    repository: 'farrukhinomov/flow-pro',
    visibility: 'private',
    homepage: 'https://flowpro.inomov.online',
    tagline: {
      de: 'Zeiterfassung, Anträge, Dienstplanung und Lohnexport für kleine und mittlere Unternehmen.',
      en: 'Time tracking, requests, shift planning and payroll export for small and mid-sized companies.',
    },
    description: {
      de: 'Eine Anwendung für Anwesenheit, Anträge, Stundenzettel, Planung und Lohnvorbereitung. React-Frontend mit Offline-Cache und Outbox, .NET-Backend als modularer Monolith mit PostgreSQL als verbindlicher Datenquelle.',
      en: 'An application for attendance, requests, timesheets, planning and payroll preparation. React frontend with an offline cache and outbox, .NET backend as a modular monolith with PostgreSQL as the source of truth.',
    },
    stack: [
      '.NET 10',
      'C#',
      'PostgreSQL',
      'EF Core',
      'React',
      'TypeScript',
      'TanStack Router',
      'Keycloak',
    ],
    year: 2026,
    featured: true,
  },
  {
    slug: 'tray-utility-app',
    name: 'Tray Utility App',
    repository: 'farrukhinomov/tray-utility-app',
    visibility: 'public',
    tagline: {
      de: 'Windows-Tray-Werkzeug, das wiederkehrende Entwickleraufgaben mit einem Klick erledigt.',
      en: 'A Windows tray tool that runs recurring developer chores in one click.',
    },
    description: {
      de: 'Eine Desktop-Anwendung im Infobereich von Windows, die eigene Hilfsprogramme lädt – etwa Ordner aufräumen oder Entwicklungsdatenbanken zurücksetzen.',
      en: 'A desktop application in the Windows notification area that loads your own utilities – for example cleaning folders or resetting development databases.',
    },
    stack: ['C#', '.NET'],
    year: 2020,
    featured: false,
  },
]);
