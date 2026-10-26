import { availability } from '@/data/availability';
import { yearsSince } from '@/data/dates';
import { describeAvailability } from '@/data/describe';
import { experience } from '@/data/experience';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import type { Locale } from '@/i18n/locales';
import { childPathFor, pathFor, type RouteKey } from '@/i18n/routes';

export interface TerminalLine {
  /** `input` echoes what was typed. */
  kind: 'input' | 'text' | 'muted' | 'error' | 'link';
  text: string;
  href?: string;
}

export interface TerminalResult {
  lines: TerminalLine[];
  /** Side effect the terminal performs after printing the lines. */
  effect?: { type: 'clear' } | { type: 'navigate'; href: string };
}

export interface TerminalContext {
  locale: Locale;
  /** Path of the current page in the other locale, used by `lang`. */
  alternatePath: string;
  now?: Date;
}

const COPY = {
  de: {
    help: 'Verfügbare Befehle:',
    commands: {
      help: 'diese Übersicht',
      whoami: 'wer ich bin',
      projects: 'meine Projekte',
      skills: 'womit ich arbeite',
      availability: 'wofür ich offen bin',
      contact: 'wie Sie mich erreichen',
      open: 'Seite öffnen: about, projects, contact',
      lang: 'Switch to English',
      clear: 'Ausgabe leeren',
    },
    years: (n: number) => `${n} Jahre Berufserfahrung als Entwickler`,
    notFound: (cmd: string) => `Befehl nicht gefunden: ${cmd}. Tippen Sie help.`,
    openUsage: 'Verwendung: open about | projects | contact',
    opening: (page: string) => `Öffne ${page} …`,
    switching: 'Wechsle zu Englisch …',
  },
  en: {
    help: 'Available commands:',
    commands: {
      help: 'this overview',
      whoami: 'who I am',
      projects: 'my projects',
      skills: 'what I work with',
      availability: 'what I am open to',
      contact: 'how to reach me',
      open: 'open a page: about, projects, contact',
      lang: 'Auf Deutsch wechseln',
      clear: 'clear the output',
    },
    years: (n: number) => `${n} years of professional development experience`,
    notFound: (cmd: string) => `Command not found: ${cmd}. Type help.`,
    openUsage: 'Usage: open about | projects | contact',
    opening: (page: string) => `Opening ${page} …`,
    switching: 'Switching to German …',
  },
} as const;

export type CommandName = keyof (typeof COPY)['de']['commands'];

export const COMMAND_NAMES = Object.keys(COPY.de.commands) as CommandName[];

const OPENABLE = ['about', 'projects', 'contact'] as const satisfies readonly RouteKey[];

const text = (value: string): TerminalLine => ({ kind: 'text', text: value });
const muted = (value: string): TerminalLine => ({ kind: 'muted', text: value });
const link = (value: string, href: string): TerminalLine => ({ kind: 'link', text: value, href });

/** Unique technologies across all Experience, most recent first. */
function skills(): string[] {
  return [...new Set(experience.flatMap((entry) => entry.stack))];
}

type Handler = (args: string[], ctx: TerminalContext) => TerminalResult;

const HANDLERS: Record<CommandName, Handler> = {
  help: (_, { locale }) => {
    const copy = COPY[locale];
    const width = Math.max(...COMMAND_NAMES.map((name) => name.length)) + 2;
    return {
      lines: [
        muted(copy.help),
        ...COMMAND_NAMES.map((name) => text(`  ${name.padEnd(width)}${copy.commands[name]}`)),
      ],
    };
  },
  whoami: (_, { locale, now }) => ({
    lines: [
      text(profile.name),
      text(profile.headline[locale]),
      muted(profile.location[locale]),
      muted(COPY[locale].years(yearsSince(profile.developerSince, now))),
    ],
  }),
  projects: (_, { locale }) => ({
    lines: projects.flatMap((project) => [
      link(project.name, childPathFor('projects', locale, project.slug)),
      muted(`  ${project.tagline[locale]}`),
    ]),
  }),
  skills: () => ({ lines: [text(skills().join(', '))] }),
  availability: (_, { locale }) => ({ lines: [text(describeAvailability(availability, locale))] }),
  contact: () => ({
    lines: [
      link(profile.email, `mailto:${profile.email}`),
      link('LinkedIn', profile.links.linkedin),
      link('GitHub', profile.links.github),
    ],
  }),
  open: ([page], { locale }) => {
    const target = OPENABLE.find((route) => route === page);
    if (!target) return { lines: [muted(COPY[locale].openUsage)] };
    const href = pathFor(target, locale);
    return { lines: [muted(COPY[locale].opening(href))], effect: { type: 'navigate', href } };
  },
  lang: (_, { locale, alternatePath }) => ({
    lines: [muted(COPY[locale].switching)],
    effect: { type: 'navigate', href: alternatePath },
  }),
  clear: () => ({ lines: [], effect: { type: 'clear' } }),
};

function isCommand(name: string): name is CommandName {
  return (COMMAND_NAMES as string[]).includes(name);
}

/** Runs one line of terminal input and returns what to print. Never throws. */
export function runCommand(input: string, ctx: TerminalContext): TerminalResult {
  const [name = '', ...args] = input.trim().toLowerCase().split(/\s+/);
  if (name === '') return { lines: [] };
  if (!isCommand(name))
    return { lines: [{ kind: 'error', text: COPY[ctx.locale].notFound(name) }] };
  return HANDLERS[name](args, ctx);
}

/** Every input the terminal understands, mapped to its precomputed result. */
export interface CommandTable {
  commands: CommandName[];
  results: Record<string, TerminalResult>;
  /** Error line for unknown input; `{cmd}` is replaced with what was typed. */
  notFound: string;
}

/**
 * Runs every known input once at build time, so the browser needs no data or validation code,
 * only this table.
 */
export function buildCommandTable(ctx: TerminalContext): CommandTable {
  const inputs = [...COMMAND_NAMES, ...OPENABLE.map((page) => `open ${page}`)];
  const results = Object.fromEntries(inputs.map((input) => [input, runCommand(input, ctx)]));
  return { commands: COMMAND_NAMES, results, notFound: COPY[ctx.locale].notFound('{cmd}') };
}
