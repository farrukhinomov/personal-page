/**
 * The file picker of the Message form: files come from the button or are dropped on the field,
 * show as a list with a remove button each, and are checked against the server's limits before
 * sending. Copy comes from the field's data attributes; list rows are cloned from a template.
 */
import { ATTACHMENT_LIMITS, extensionOf, formatSize } from '@/server/attachments';

interface AttachmentCopy {
  type: string;
  count: string;
  size: string;
  remove: string;
}

export interface AttachmentPicker {
  files(): readonly File[];
  validate(): boolean;
  focusTarget: HTMLElement | null;
}

export function setUpAttachments(root: HTMLElement): AttachmentPicker {
  const copy = JSON.parse(root.dataset.copy ?? '{}') as AttachmentCopy;
  const input = root.querySelector<HTMLInputElement>('input[type="file"]');
  const list = root.querySelector<HTMLElement>('[data-file-list]');
  const template = root.querySelector<HTMLTemplateElement>('[data-file-template]');
  const error = root.querySelector<HTMLElement>('[data-file-error]');
  let files: File[] = [];
  /** Names refused at the last addition, because of their type or because they are empty. */
  let refused: string[] = [];

  const problem = (): string => {
    if (refused.length > 0) return copy.type.replace('{name}', refused.join(', '));
    if (files.length > ATTACHMENT_LIMITS.files) return copy.count;
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total > ATTACHMENT_LIMITS.totalBytes) return copy.size;
    return '';
  };

  const validate = (): boolean => {
    const text = problem();
    if (error) error.textContent = text;
    input?.setAttribute('aria-invalid', String(Boolean(text)));
    return !text;
  };

  const render = () => {
    list?.replaceChildren(...files.map((file, index) => row(file, index)));
    if (list) list.hidden = files.length === 0;
    validate();
  };

  const row = (file: File, index: number): Node => {
    const fragment = template?.content.cloneNode(true) as DocumentFragment;
    const name = fragment.querySelector('[data-file-name]');
    const size = fragment.querySelector('[data-file-size]');
    const remove = fragment.querySelector<HTMLButtonElement>('[data-file-remove]');
    if (name) name.textContent = file.name;
    if (size) size.textContent = formatSize(file.size);
    remove?.setAttribute('aria-label', copy.remove.replace('{name}', file.name));
    remove?.addEventListener('click', () => {
      files = files.filter((_, at) => at !== index);
      refused = [];
      render();
      // Focus stays in the list, or returns to the picker once the list is empty.
      const buttons = list?.querySelectorAll<HTMLButtonElement>('[data-file-remove]');
      (buttons?.[Math.min(index, buttons.length - 1)] ?? input)?.focus();
    });
    return fragment;
  };

  const add = (added: Iterable<File>) => {
    refused = [];
    for (const file of added) {
      if (!extensionOf(file.name) || file.size === 0) {
        refused.push(file.name);
        continue;
      }
      const known = files.some((kept) => kept.name === file.name && kept.size === file.size);
      if (!known) files = [...files, file];
    }
    render();
  };

  input?.addEventListener('change', () => {
    add(input.files ?? []);
    // Cleared, so choosing the same file again after removing it still fires `change`.
    input.value = '';
  });

  root.addEventListener('dragover', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    root.dataset.dragging = '';
  });
  root.addEventListener('dragleave', (event) => {
    if (!root.contains(event.relatedTarget as Node | null)) delete root.dataset.dragging;
  });
  root.addEventListener('drop', (event) => {
    event.preventDefault();
    delete root.dataset.dragging;
    add(event.dataTransfer?.files ?? []);
  });

  return { files: () => files, validate, focusTarget: input };
}
