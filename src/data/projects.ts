import { projectsSchema } from './schema';

/** Ordered by how prominently they are shown. */
export const projects = projectsSchema.parse([
  {
    slug: 'kritis-grc',
    name: 'KRITIS GRC',
    repository: 'farrukhinomov/kritis-grc',
    visibility: 'public',
    tagline: {
      de: 'Compliance-SaaS für Betreiber kritischer Anlagen nach KRITIS-Dachgesetz und NIS2.',
      en: 'Compliance SaaS for operators of critical facilities under the KRITIS umbrella act and NIS2.',
    },
    description: {
      de: 'Eine mandantenfähige Governance-, Risk- und Compliance-Plattform für Betreiber kritischer Anlagen in Deutschland. Sie deckt das KRITIS-Dachgesetz ab und bildet es auf NIS2 im BSIG ab, sodass eine Maßnahme für beide Regelwerke zählt.',
      en: 'A multi-tenant governance, risk and compliance platform for operators of critical facilities in Germany. It covers the KRITIS umbrella act and maps it to NIS2 as implemented in the BSIG, so one measure counts toward both.',
    },
    stack: ['Django', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'Docker'],
    year: 2026,
    featured: true,
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
