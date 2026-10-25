import { describe, expect, it } from 'vitest';
import { buildCommandTable, COMMAND_NAMES, runCommand, type TerminalContext } from './commands';
import { completeInput, History, resolveInput } from './session';

const de: TerminalContext = { locale: 'de', alternatePath: '/en', now: new Date(2026, 9, 25) };
const en: TerminalContext = { locale: 'en', alternatePath: '/', now: new Date(2026, 9, 25) };

const texts = (input: string, ctx: TerminalContext) =>
  runCommand(input, ctx).lines.map((l) => l.text);

describe('runCommand', () => {
  it('lists every command in help', () => {
    const output = texts('help', en).join('\n');
    for (const name of COMMAND_NAMES) expect(output).toContain(name);
  });

  it('answers whoami with name and computed years', () => {
    expect(texts('whoami', de)).toContain('7 Jahre Berufserfahrung als Entwickler');
    expect(texts('WhoAmI', en)[0]).toBe('Farrukh Inomov');
  });

  it('links each project to its detail page in the current locale', () => {
    const links = runCommand('projects', en).lines.filter((l) => l.kind === 'link');
    expect(links.map((l) => l.href)).toContain('/en/projects/kritis-grc');
  });

  it('navigates with open and explains usage for unknown pages', () => {
    expect(runCommand('open contact', de).effect).toEqual({ type: 'navigate', href: '/kontakt' });
    expect(runCommand('open nowhere', de).effect).toBeUndefined();
  });

  it('switches language to the alternate path', () => {
    expect(runCommand('lang', de).effect).toEqual({ type: 'navigate', href: '/en' });
  });

  it('clears and ignores empty input', () => {
    expect(runCommand('clear', en).effect).toEqual({ type: 'clear' });
    expect(runCommand('   ', en).lines).toEqual([]);
  });

  it('reports unknown commands as errors', () => {
    const [line] = runCommand('sudo rm', en).lines;
    expect(line).toEqual({ kind: 'error', text: 'Command not found: sudo. Type help.' });
  });
});

describe('command table (browser side)', () => {
  const table = buildCommandTable(en);

  it('resolves the same results as runCommand', () => {
    expect(resolveInput('  Projects ', table)).toEqual(runCommand('projects', en));
    expect(resolveInput('open   about', table)).toEqual(runCommand('open about', en));
  });

  it('falls back to the bare command for unknown arguments', () => {
    expect(resolveInput('open moon', table)).toEqual(runCommand('open', en));
  });

  it('builds the not-found message for unknown input', () => {
    expect(resolveInput('rm -rf', table).lines[0]?.text).toBe('Command not found: rm. Type help.');
  });

  it('returns nothing for empty input', () => {
    expect(resolveInput('', table)).toEqual({ lines: [] });
  });
});

describe('completeInput', () => {
  it('completes a unique prefix', () => {
    expect(completeInput('who', COMMAND_NAMES)).toBe('whoami ');
  });

  it('leaves ambiguous, empty and argument input alone', () => {
    expect(completeInput('c', COMMAND_NAMES)).toBe('c');
    expect(completeInput('', COMMAND_NAMES)).toBe('');
    expect(completeInput('open ab', COMMAND_NAMES)).toBe('open ab');
  });
});

describe('History', () => {
  it('walks back and forward like a shell', () => {
    const history = new History();
    expect(history.previous()).toBeUndefined();
    history.push('help');
    history.push('whoami');
    history.push('whoami');
    expect(history.previous()).toBe('whoami');
    expect(history.previous()).toBe('help');
    expect(history.previous()).toBe('help');
    expect(history.next()).toBe('whoami');
    expect(history.next()).toBe('');
  });

  it('ignores blank entries', () => {
    const history = new History();
    history.push('   ');
    expect(history.previous()).toBeUndefined();
  });
});
