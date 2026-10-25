import { profileSchema } from './schema';

export const profile = profileSchema.parse({
  name: 'Farrukh Inomov',
  headline: {
    de: 'Senior Full-Stack-Entwickler für C#/.NET, React und TypeScript',
    en: 'Senior full-stack developer for C#/.NET, React and TypeScript',
  },
  summary: {
    de: 'Ich entwickle Business-Software, die im Alltag zuverlässig läuft – von der Architektur bis zum Betrieb beim Kunden. Mir sind saubere Architektur, automatisierte Tests und nachvollziehbar dokumentierte Entscheidungen wichtig.',
    en: 'I build business software that holds up in daily use – from the architecture to running it at the customer. I care about clean architecture, automated tests and decisions that are written down.',
  },
  location: { de: 'Saarbrücken, Deutschland', en: 'Saarbrücken, Germany' },
  email: 'farrukhfinomov@gmail.com',
  developerSince: '2019-09',
  links: {
    github: 'https://github.com/farrukhinomov',
    linkedin: 'https://www.linkedin.com/in/farrukhinomov',
  },
  languages: [
    {
      name: { de: 'Deutsch', en: 'German' },
      level: { de: 'sicher im Berufsalltag', en: 'professional working' },
    },
    { name: { de: 'Englisch', en: 'English' }, level: { de: 'fließend', en: 'full professional' } },
    { name: { de: 'Russisch', en: 'Russian' }, level: { de: 'Muttersprache', en: 'native' } },
    { name: { de: 'Tadschikisch', en: 'Tajik' }, level: { de: 'Muttersprache', en: 'native' } },
  ],
  awards: [
    {
      title: {
        de: 'Silbermedaille, Nationale Informatik-Olympiade Tadschikistan',
        en: 'Silver medal, National Informatics Olympiad of Tajikistan',
      },
      year: 2012,
    },
  ],
});
