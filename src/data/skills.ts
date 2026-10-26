import { skillsSchema } from './schema';

/**
 * Skills, grouped by where they come from: paid work, own projects, or how Farrukh works.
 * Technology names are not translated; everything else is.
 * A skill moves to `professional` only once it has been used in a job.
 */
export const skills = skillsSchema.parse([
  {
    id: 'professional',
    name: { de: 'Berufserfahrung', en: 'Professional experience' },
    kind: 'tags',
    items: [
      'C#',
      '.NET',
      'ASP.NET Core',
      'Blazor',
      'REST APIs',
      'EF Core',
      'Dapper',
      'ORM',
      'SQL Server',
      'PostgreSQL',
      'Hangfire',
      {
        de: 'Integrationen (OAuth2, Microsoft 365, Google)',
        en: 'Integrations (OAuth2, Microsoft 365, Google)',
      },
      { de: 'Automatisierte Tests', en: 'Automated testing' },
      'TeamCity',
      'GitLab CI',
      'Docker',
      'Prometheus',
      'Grafana',
      'OpenTelemetry',
    ],
  },
  {
    id: 'own-projects',
    name: { de: 'Eigenprojekte – im Ausbau', en: 'Own projects – in progress' },
    note: { de: 'Aus FlowPro und KRITIS GRC', en: 'From FlowPro and KRITIS GRC' },
    kind: 'tags',
    items: [
      'React',
      'TypeScript',
      'JavaScript',
      'ES6',
      'Ant Design',
      'Vitest',
      'Playwright',
      'Python',
      'Django',
      'FastAPI',
    ],
  },
  {
    id: 'ways-of-working',
    name: { de: 'Arbeitsweise', en: 'Ways of working' },
    kind: 'list',
    items: [
      { de: 'AI-First-Entwicklung', en: 'AI First Development' },
      {
        de: 'KI-gestützte Code-Reviews und Coding-Tools',
        en: 'AI-assisted Code Review & Coding Tools',
      },
      {
        de: 'Teamübergreifende Zusammenarbeit mit Produktmanagement und UX',
        en: 'Cross-team collaboration with Product Management and UX',
      },
      { de: 'Wissensaustausch', en: 'Knowledge sharing' },
    ],
  },
]);
