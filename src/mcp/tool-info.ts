import type { Localized } from '@/i18n/locales';

/**
 * The MCP tools as people see them: name, title and what each does, in both languages. The server
 * registers its tools under these names and English titles, in this order; a test keeps the two in
 * step, so the Connect page, the terminal and llms.txt never list a tool the server lacks.
 */
export interface ToolInfo {
  name: string;
  title: Localized;
  /** One sentence for people; the server's own description is written for the model. */
  summary: Localized;
  /** Sends something to Farrukh; assistants ask their user before calling it. */
  sends: boolean;
}

export const TOOLS = [
  {
    name: 'get_profile',
    title: { de: 'Profil', en: 'Profile' },
    summary: {
      de: 'Wer ich bin: Schwerpunkt, Standort, Sprachen, Lebenslauf und Links.',
      en: 'Who I am: focus, location, languages, CV and links.',
    },
    sends: false,
  },
  {
    name: 'get_experience',
    title: { de: 'Berufserfahrung', en: 'Experience' },
    summary: {
      de: 'Stationen und Ausbildung mit Aufgaben, Ergebnissen und Technologien.',
      en: 'Positions and education with tasks, results and technologies.',
    },
    sends: false,
  },
  {
    name: 'get_skills',
    title: { de: 'Kenntnisse', en: 'Skills' },
    summary: {
      de: 'Kenntnisse, geordnet nach Beruf, eigenen Projekten und Arbeitsweise.',
      en: 'Skills, grouped by work, own projects and way of working.',
    },
    sends: false,
  },
  {
    name: 'list_projects',
    title: { de: 'Projekte', en: 'Projects' },
    summary: {
      de: 'Alle Projekte mit Kurzbeschreibung, Technologien und Links.',
      en: 'All projects with a short description, technologies and links.',
    },
    sends: false,
  },
  {
    name: 'get_project',
    title: { de: 'Projekt', en: 'Project' },
    summary: {
      de: 'Ein Projekt im Detail: worum es geht und was umgesetzt ist.',
      en: 'One project in detail: what it is about and what is built.',
    },
    sends: false,
  },
  {
    name: 'list_posts',
    title: { de: 'Blogartikel', en: 'Blog posts' },
    summary: {
      de: 'Alle Artikel mit Datum, Themen und Lesezeit.',
      en: 'All posts with date, topics and reading time.',
    },
    sends: false,
  },
  {
    name: 'get_post',
    title: { de: 'Blogartikel', en: 'Blog post' },
    summary: {
      de: 'Ein Artikel im vollen Wortlaut.',
      en: 'One post in full.',
    },
    sends: false,
  },
  {
    name: 'get_available_slots',
    title: { de: 'Freie Termine', en: 'Free intro call times' },
    summary: {
      de: 'Freie Zeiten für einen 30-minütigen Intro Call in Ihrer Zeitzone.',
      en: 'Free times for a 30-minute intro call in your time zone.',
    },
    sends: false,
  },
  {
    name: 'send_message',
    title: { de: 'Nachricht senden', en: 'Send Farrukh a message' },
    summary: {
      de: 'Schickt mir Ihre Nachricht per E-Mail, etwa ein Stellenangebot.',
      en: 'Sends me your message by email, such as a job offer.',
    },
    sends: true,
  },
  {
    name: 'book_call',
    title: { de: 'Intro Call anfragen', en: 'Request an intro call' },
    summary: {
      de: 'Fragt einen freien Termin an; ich bestätige jede Anfrage selbst.',
      en: 'Requests a free time; I confirm every request myself.',
    },
    sends: true,
  },
] as const satisfies readonly ToolInfo[];

export type ToolName = (typeof TOOLS)[number]['name'];

/** The title the server registers a tool with: the English one. */
export function toolTitle(name: ToolName): string {
  return TOOLS.find((tool) => tool.name === name)?.title.en ?? name;
}
