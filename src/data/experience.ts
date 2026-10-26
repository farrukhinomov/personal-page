import { experienceSchema } from './schema';

/** Newest first. */
export const experience = experienceSchema.parse([
  {
    id: 'intex',
    kind: 'work',
    organization: 'INTEX EDV-Software GmbH',
    role: { de: 'Senior Full Stack Software Engineer', en: 'Senior Full Stack Software Engineer' },
    location: { de: 'Saarbrücken, Deutschland', en: 'Saarbrücken, Germany' },
    start: '2022-07',
    end: null,
    summary: {
      de: 'Web-Anwendungen und Dienste rund um ein ERP-System – überwiegend als alleinverantwortlicher Entwickler, von der Architektur bis zum Betrieb.',
      en: 'Web applications and services around an ERP system – mostly as the sole responsible developer, from architecture to operations.',
    },
    highlights: [
      {
        de: 'E-Mail-Versanddienst mit OAuth2 für Microsoft 365 und Google, produktiv bei Kunden: Versand in Batches, Wiederholversuche, idempotente Zustellung.',
        en: 'Email delivery service with OAuth2 for Microsoft 365 and Google, in production at customers: batched sending, retries, idempotent delivery.',
      },
      {
        de: 'Modernisierung eines ERP-Konfigurationswerkzeugs zum modularen Monolithen mit Clean Architecture und DDD, abgesichert durch über 1000 automatisierte Tests.',
        en: 'Modernised an ERP configuration tool into a modular monolith with clean architecture and DDD, covered by more than 1000 automated tests.',
      },
      {
        de: 'KI-Erklärungen und -Übersetzungen mit lokalen und Cloud-LLMs; Daten werden nur nach Zustimmung weitergegeben.',
        en: 'AI explanations and translations with local and cloud LLMs; data is shared only after consent.',
      },
      {
        de: 'Ablösung einer Delphi-Anwendung, die ohne Schemaänderung in die bestehende Datenbank schreibt.',
        en: 'Replaced a Delphi application with one that writes to the existing database without schema changes.',
      },
      {
        de: 'Monitoring, Tracing und Logging mit Prometheus, Grafana und OpenTelemetry – on-premise und in der Cloud.',
        en: 'Monitoring, tracing and logging with Prometheus, Grafana and OpenTelemetry – on-premise and in the cloud.',
      },
    ],
    stack: [
      'C#',
      '.NET 10',
      'ASP.NET Core',
      'Blazor',
      'EF Core',
      'Dapper',
      'PostgreSQL',
      'SQL Server',
      'Hangfire',
      'Docker',
      'Traefik',
      'TeamCity',
      'OpenTelemetry',
    ],
  },
  {
    id: 'bazarfoods',
    kind: 'work',
    organization: 'Bazarfoods',
    role: { de: 'Gründer und Inhaber', en: 'Founder and owner' },
    location: { de: 'Kiew, Ukraine', en: 'Kyiv, Ukraine' },
    start: '2021-09',
    end: '2022-06',
    summary: {
      de: 'Aufbau und Betrieb eines Einzelhandelsgeschäfts für Bio-Produkte. 2022 kriegsbedingt geschlossen, danach Umzug nach Deutschland.',
      en: 'Built and ran a retail shop for organic products. Closed in 2022 because of the war; I then moved to Germany.',
    },
    highlights: [
      {
        de: 'Lieferanten gewonnen, Mietvertrag verhandelt, Kassensystem eingeführt.',
        en: 'Won suppliers, negotiated the lease, introduced the point-of-sale system.',
      },
    ],
    stack: [],
  },
  {
    id: 'silk-road-professionals',
    kind: 'work',
    organization: 'Silk Road Professionals Tajikistan',
    role: { de: 'Software Engineer', en: 'Software Engineer' },
    location: { de: 'Dehmoy, Tadschikistan', en: 'Dehmoy, Tajikistan' },
    start: '2019-09',
    end: '2021-08',
    summary: {
      de: 'Kernteam einer ERP-Plattform der nächsten Generation für kleine Unternehmen, im Auftrag von Koble Systems, Inc. (USA).',
      en: 'Core team of a next-generation ERP platform for small businesses, built for Koble Systems, Inc. (USA).',
    },
    highlights: [
      {
        de: 'Mitentwicklung des „Model Designer“, einer ereignisgesteuerten UWP-Anwendung (MEF) zur Definition dynamischer Server- und Client-Anwendungen.',
        en: 'Co-developed the “Model Designer”, an event-driven UWP application (MEF) that defines dynamic server and client applications.',
      },
      {
        de: 'Umfangreiche Geschäftslogik, konsequent mit automatisierten Tests abgesichert; CI/CD und Code-Reviews über Azure DevOps.',
        en: 'Extensive business logic, consistently covered by automated tests; CI/CD and code reviews in Azure DevOps.',
      },
      {
        de: 'Remote-Zusammenarbeit mit dem US-Team auf Englisch; Dozent für .NET an lokalen Hochschulen.',
        en: 'Remote collaboration with the US team in English; taught .NET to students of local universities.',
      },
    ],
    stack: ['C#', '.NET', 'UWP', 'MEF', 'Azure DevOps', 'SQL Server', 'NUnit', 'xUnit'],
  },
  {
    id: 'bazarfoods-online',
    kind: 'work',
    organization: 'Bazarfoods.ru',
    role: { de: 'Mitgründer', en: 'Co-founder' },
    location: { de: 'Moskau, Russland', en: 'Moscow, Russia' },
    start: '2018-11',
    end: '2019-07',
    summary: {
      de: 'Aufbau und Betrieb eines Online-Shops für Trockenfrüchte und Nüsse auf Basis von OpenCart, inklusive SEO und Google Ads.',
      en: 'Built and ran an online shop for dried fruit and nuts on OpenCart, including SEO and Google Ads.',
    },
    highlights: [],
    stack: ['OpenCart'],
  },
  {
    id: 'ministry-of-transport',
    kind: 'work',
    organization: 'Ministry of Transport of the Republic of Tajikistan',
    role: { de: 'Dolmetscher und Fuhrparkleiter', en: 'Interpreter and fleet manager' },
    location: { de: 'Konibodom, Tadschikistan', en: 'Konibodom, Tajikistan' },
    start: '2016-12',
    end: '2018-11',
    summary: {
      de: 'Internationales Straßenbauprojekt: Übersetzung und Dolmetschen (Englisch, Russisch, Tadschikisch) sowie Leitung eines Teams von zehn Fahrern.',
      en: 'International road construction project: translation and interpreting (English, Russian, Tajik) and leading a team of ten drivers.',
    },
    highlights: [],
    stack: [],
  },
  {
    id: 'polytechnic',
    kind: 'education',
    organization: 'Polytechnic Institute of the Tajik Technical University',
    role: {
      de: 'Bachelor, Informationstechnologien und -systeme in der Wirtschaft',
      en: 'Bachelor, Information Technology and Systems in Economics',
    },
    location: { de: 'Tadschikistan', en: 'Tajikistan' },
    start: '2012-09',
    end: '2016-07',
    summary: {
      de: 'Studium der Wirtschaftsinformatik.',
      en: 'Degree in business information systems.',
    },
    highlights: [],
    stack: [],
  },
]);
