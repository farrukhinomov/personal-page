import { skillsSchema } from './schema';

/**
 * Skills, grouped. Technology names are not translated; ways of working are.
 * `tags` groups render as chips, `list` groups as plain lines.
 */
export const skills = skillsSchema.parse([
  {
    id: 'backend',
    name: { de: 'Backend', en: 'Backend' },
    kind: 'tags',
    items: [
      'C#',
      '.NET',
      'ASP.NET Core',
      'Python',
      'Django',
      'Django REST Framework (DRF)',
      'FastAPI',
      'REST APIs',
      'Hangfire',
    ],
  },
  {
    id: 'frontend',
    name: { de: 'Frontend', en: 'Frontend' },
    kind: 'tags',
    items: ['React', 'TypeScript', 'JavaScript', 'ES6', 'Ant Design', 'Blazor'],
  },
  {
    id: 'data',
    name: { de: 'Daten', en: 'Data' },
    kind: 'tags',
    items: ['PostgreSQL', 'SQL Server', 'ORM', 'EF Core', 'Dapper'],
  },
  {
    id: 'operations',
    name: { de: 'Betrieb', en: 'Operations' },
    kind: 'tags',
    items: ['Docker', 'Traefik', 'TeamCity', 'GitLab CI', 'Prometheus', 'Grafana', 'OpenTelemetry'],
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
