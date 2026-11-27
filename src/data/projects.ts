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
    screenshot: {
      light: 'src/assets/projects/kritis-grc/dashboard-light.png',
      dark: 'src/assets/projects/kritis-grc/dashboard-dark.png',
      alt: {
        de: 'Übersicht des KRITIS-GRC-Prototyps mit fiktiven Demodaten: Compliance je Framework und Anlage, Restrisiko-Matrix, Top-5-Risiken und Fristen',
        en: 'Overview screen of the KRITIS GRC prototype with fictional demo data: compliance per framework and facility, residual risk matrix, top five risks and deadlines',
      },
    },
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
    visibility: 'public',
    tagline: {
      de: 'Zeiterfassung, Abwesenheiten, Stundenzettel und Lohnvorbereitung für kleine und mittlere Unternehmen in Deutschland – mandantenfähig und quelloffen.',
      en: 'Time tracking, absences, timesheets and payroll preparation for small and mid-sized companies in Germany – multi-tenant and open source.',
    },
    description: {
      de: 'Eigenständiges Open-Source-Projekt (AGPL-3.0) für Personalprozesse in kleinen und mittleren Unternehmen: vom Stempeln über Anträge und Freigaben bis zum signierten Stundenzettel und dem Export für die Lohnabrechnung. Das Backend ist ein modularer Monolith mit .NET 10 und PostgreSQL, das Frontend eine React-SPA mit Offline-Cache. Der gesamte Stack startet mit einem einzigen Docker-Compose-Befehl.',
      en: 'An independent open-source project (AGPL-3.0) for workforce processes in small and mid-sized companies: from clocking in, through requests and approvals, to the signed timesheet and the export for payroll. The backend is a modular monolith on .NET 10 and PostgreSQL, the frontend a React SPA with an offline cache. The whole stack starts with a single Docker Compose command.',
    },
    stack: [
      '.NET 10',
      'C#',
      'ASP.NET Core',
      'EF Core',
      'PostgreSQL',
      'React',
      'TypeScript',
      'TanStack Router',
      'Docker',
      'OpenTelemetry',
    ],
    year: 2026,
    featured: true,
    sections: [
      {
        heading: { de: 'Funktionen', en: 'Features' },
        items: [
          {
            de: 'Stempeln mit Pausen und Arbeitsort, Korrekturanträge für vergessene Buchungen',
            en: 'Clocking in and out with breaks and work location, correction requests for missed bookings',
          },
          {
            de: 'Abwesenheitsanträge mit Freigabe durch die Führungskraft – auch mit Änderungen und über Vertretungen',
            en: 'Absence requests approved by the manager – also with changes and through delegates',
          },
          {
            de: 'Monatlicher Stundenzettel mit Flexsaldo, Signierung und unveränderlichem Snapshot',
            en: 'Monthly timesheet with flex balance, sign-off and an immutable snapshot',
          },
          {
            de: 'Teamplanung und Verfügbarkeit mit den gesetzlichen Feiertagen aller 16 Bundesländer, berechnet für jedes Jahr',
            en: 'Team planning and availability with the public holidays of all 16 German states, computed for any year',
          },
          {
            de: 'Lohnvorbereitung mit Export als CSV, Excel und PDF',
            en: 'Payroll preparation with export to CSV, Excel and PDF',
          },
          {
            de: 'Oberfläche auf Deutsch und Englisch, in hellem und dunklem Design',
            en: 'Interface in German and English, in light and dark themes',
          },
        ],
      },
      {
        heading: { de: 'Architektur', en: 'Architecture' },
        items: [
          {
            de: 'Modularer Monolith mit .NET 10 und den Schichten Domain, Application, Infrastructure und API; Architekturtests erzwingen die Abhängigkeitsregeln',
            en: 'Modular monolith on .NET 10 with Domain, Application, Infrastructure and API layers; architecture tests enforce the dependency rules',
          },
          {
            de: 'Leichtgewichtiges CQRS ohne MediatR, Minimal APIs mit Fehlerantworten nach RFC 7807 und OpenAPI',
            en: 'Lightweight CQRS without MediatR, minimal APIs with RFC 7807 problem details and OpenAPI',
          },
          {
            de: 'Mandantentrennung in der Datenbank per PostgreSQL Row-Level Security – nicht nur per WHERE-Bedingung im Code',
            en: 'Tenant isolation in the database with PostgreSQL row-level security – not only a WHERE clause in code',
          },
          {
            de: 'Transaktionale Outbox mit eigenem Worker (FOR UPDATE SKIP LOCKED), Idempotenzschlüssel für Befehle und unveränderliche Audit-Ereignisse',
            en: 'Transactional outbox with its own worker (FOR UPDATE SKIP LOCKED), idempotency keys on commands and append-only audit events',
          },
          {
            de: 'React-SPA mit TanStack Router und Query; IndexedDB-Cache und Sync-Outbox für instabile Verbindungen',
            en: 'React SPA with TanStack Router and Query; IndexedDB cache and sync outbox for unreliable connections',
          },
        ],
      },
      {
        heading: { de: 'Sicherheit und Datenschutz', en: 'Security and privacy' },
        items: [
          {
            de: 'Serverseitige Sessions in HttpOnly-Cookies – keine Tokens im Browser',
            en: 'Server-side sessions in HttpOnly cookies – no tokens in the browser',
          },
          {
            de: 'Optionale Zwei-Faktor-Anmeldung per Authenticator-App mit Wiederherstellungscodes',
            en: 'Optional two-step sign-in with an authenticator app and recovery codes',
          },
          {
            de: 'Berechtigungsbasierte Autorisierung, Rate Limiting, Kontosperre und CSRF-Schutz',
            en: 'Permission-based authorization, rate limiting, account lockout and CSRF protection',
          },
          {
            de: 'Datenschutz pro Rolle: Teammitglieder, Führungskräfte und HR sehen je Abwesenheitsart nur die nötigen Details; Einsichten in sensible Daten werden protokolliert',
            en: 'Privacy per role: teammates, managers and HR see only the details each absence type needs; views of sensitive data are logged',
          },
        ],
      },
      {
        heading: { de: 'Qualität und Betrieb', en: 'Quality and operations' },
        items: [
          {
            de: 'Über 300 Backend-Tests mit xUnit, darunter Tests der Mandantentrennung gegen echtes PostgreSQL mit Testcontainers',
            en: 'More than 300 backend tests with xUnit, including tenant isolation tests against a real PostgreSQL with Testcontainers',
          },
          {
            de: 'Über 300 Frontend-Unit-Tests, Playwright-End-to-End-Tests gegen die echte API, visuelle Prüfung in drei Viewports und ein Performance-Budget',
            en: 'More than 300 frontend unit tests, Playwright end-to-end tests against the real API, visual checks in three viewports and a performance budget',
          },
          {
            de: 'CI mit Format-, Schwachstellen- und Lizenzprüfung, Secret-Scan und Prüfung auf fehlende Migrationen',
            en: 'CI with format, vulnerability and licence checks, a secret scan and a check for missing migrations',
          },
          {
            de: 'Deployment per Docker Compose mit Caddy und automatischem TLS; Images für amd64 und arm64 zu jedem Release, Server als Code mit OpenTofu',
            en: 'Deployment with Docker Compose and Caddy with automatic TLS; amd64 and arm64 images for every release, the server as code with OpenTofu',
          },
          {
            de: 'OpenTelemetry für Traces, Metriken und Logs, Health-Checks sowie Skripte für Backup und Wiederherstellung',
            en: 'OpenTelemetry for traces, metrics and logs, health checks, and scripts for backup and restore',
          },
        ],
      },
    ],
    sectionsUpdated: '2026-11-18',
    screenshot: {
      light: 'src/assets/projects/flowpro/timesheet-light.png',
      dark: 'src/assets/projects/flowpro/timesheet-dark.png',
      alt: {
        de: 'Monatlicher Stundenzettel in FlowPro mit fiktiven Demodaten: Soll- und Ist-Stunden, Flexsaldo und eine Zeitleiste je Tag mit Arbeitszeit und Pausen',
        en: 'Monthly timesheet in FlowPro with fictional demo data: target and worked hours, flex balance and a timeline per day with working time and breaks',
      },
    },
    gallery: [
      {
        light: 'src/assets/projects/flowpro/approval-light.png',
        dark: 'src/assets/projects/flowpro/approval-dark.png',
        alt: {
          de: 'Dialog zur Prüfung eines Urlaubsantrags in FlowPro mit verborgener Begründung und den Schaltflächen Ablehnen und Genehmigen',
          en: 'Dialog for reviewing a vacation request in FlowPro, with the reason hidden and the buttons Reject and Approve',
        },
        caption: {
          de: 'Freigabe eines Urlaubsantrags: Die Führungskraft sieht nur die betrieblich nötigen Angaben, Begründung und Anhänge bleiben privat.',
          en: 'Approving a vacation request: the manager sees only the operational details; the reason and attachments stay private.',
        },
      },
      {
        light: 'src/assets/projects/flowpro/privacy-light.png',
        dark: 'src/assets/projects/flowpro/privacy-dark.png',
        alt: {
          de: 'Einstellungen der Abwesenheitsarten in FlowPro mit der Sichtbarkeit für Teammitglieder, Führungskräfte und HR/Administration',
          en: 'Absence type settings in FlowPro with the visibility for teammates, managers and HR/admins',
        },
        caption: {
          de: 'Sichtbarkeit je Abwesenheitsart und Rolle: Teammitglieder sehen höchstens den Status, HR und Administration alle Details.',
          en: 'Visibility per absence type and role: teammates see at most the status, HR and admins see every detail.',
        },
      },
    ],
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
