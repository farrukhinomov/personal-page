import type { CommandTable, TerminalResult } from './commands';

/** Looks up typed input in the precomputed table. Runs in the browser; has no data imports. */
export function resolveInput(input: string, table: CommandTable): TerminalResult {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized === '') return { lines: [] };

  const known = table.results[normalized] ?? table.results[normalized.split(' ')[0] ?? ''];
  if (known) return known;

  const name = normalized.split(' ')[0] ?? normalized;
  return { lines: [{ kind: 'error', text: table.notFound.replace('{cmd}', name) }] };
}

/** Completes a partial command name; returns the input unchanged when it is ambiguous. */
export function completeInput(input: string, commands: readonly string[]): string {
  const partial = input.trimStart().toLowerCase();
  if (partial === '' || partial.includes(' ')) return input;
  const matches = commands.filter((name) => name.startsWith(partial));
  return matches.length === 1 ? `${matches[0]} ` : input;
}

/** Shell-like history: ArrowUp walks back, ArrowDown walks forward to an empty line. */
export class History {
  private readonly entries: string[] = [];
  private cursor = 0;

  push(entry: string): void {
    const trimmed = entry.trim();
    if (trimmed !== '' && this.entries.at(-1) !== trimmed) this.entries.push(trimmed);
    this.cursor = this.entries.length;
  }

  previous(): string | undefined {
    if (this.entries.length === 0) return undefined;
    this.cursor = Math.max(0, this.cursor - 1);
    return this.entries[this.cursor];
  }

  next(): string {
    this.cursor = Math.min(this.entries.length, this.cursor + 1);
    return this.entries[this.cursor] ?? '';
  }
}
