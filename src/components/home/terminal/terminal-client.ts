import type { CommandTable, TerminalLine } from './commands';
import { completeInput, History, resolveInput } from './session';

/** Delay between typed characters when the terminal demonstrates a command itself. */
const TYPE_DELAY_MS = 55;
const DEMO_COMMAND = 'whoami';

function renderLine(line: TerminalLine): HTMLElement {
  const element = document.createElement('p');
  element.className = `line line--${line.kind}`;
  if (line.kind === 'link' && line.href) {
    const anchor = document.createElement('a');
    anchor.href = line.href;
    anchor.textContent = line.text;
    element.append(anchor);
  } else {
    // textContent, never innerHTML: output can never inject markup.
    element.textContent = line.text;
  }
  return element;
}

export function initTerminal(root: HTMLElement): void {
  const screen = root.querySelector<HTMLElement>('[data-screen]');
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const input = root.querySelector<HTMLInputElement>('[data-input]');
  const tableSource = root.querySelector('[data-command-table]')?.textContent;
  if (!screen || !form || !input || !tableSource) return;

  const table = JSON.parse(tableSource) as CommandTable;
  const history = new History();
  let interacted = false;

  function print(lines: TerminalLine[]) {
    screen?.append(...lines.map(renderLine));
    screen?.scrollTo({ top: screen.scrollHeight });
  }

  function execute(command: string) {
    history.push(command);
    print([{ kind: 'input', text: command }]);
    const result = resolveInput(command, table);
    if (result.effect?.type === 'clear') {
      screen?.replaceChildren();
      return;
    }
    print(result.lines);
    if (result.effect?.type === 'navigate') window.location.assign(result.effect.href);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    interacted = true;
    const command = input.value;
    input.value = '';
    if (command.trim() !== '') execute(command);
  });

  input.addEventListener('keydown', (event) => {
    interacted = true;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      input.value = history.previous() ?? input.value;
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      input.value = history.next();
    } else if (event.key === 'Tab' && input.value.trim() !== '') {
      // Only capture Tab while there is something to complete, so keyboard users can leave.
      const completed = completeInput(input.value, table.commands);
      if (completed !== input.value) {
        event.preventDefault();
        input.value = completed;
      }
    }
  });

  root.querySelectorAll<HTMLButtonElement>('[data-command]').forEach((button) => {
    button.addEventListener('click', () => {
      interacted = true;
      const command = button.dataset.command;
      if (command) execute(command);
    });
  });

  const typeDemo = async () => {
    for (const char of DEMO_COMMAND) {
      if (interacted) return;
      input.value += char;
      await new Promise((resolve) => setTimeout(resolve, TYPE_DELAY_MS));
    }
    if (interacted) return;
    input.value = '';
    execute(DEMO_COMMAND);
  };

  // Once the terminal is first seen, it types one command by itself to show what it does.
  // Skipped for reduced motion, and abandoned as soon as the visitor interacts.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      void typeDemo();
    },
    { threshold: 0.6 },
  );
  observer.observe(root);
}
