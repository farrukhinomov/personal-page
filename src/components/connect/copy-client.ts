/**
 * Copy buttons on the Connect page: `data-copy` holds the text, `data-copied` the label shown for
 * a moment after copying. The page's live region announces it, so screen readers hear it too.
 */
const COPIED_MS = 2000;

setUpCopyButtons(document.querySelector<HTMLElement>('[data-copy-status]'));

function setUpCopyButtons(announcer: HTMLElement | null): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    const label = button.querySelector<HTMLElement>('[data-copy-label]');
    const idle = label?.textContent ?? '';
    let timer: number | undefined;

    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy ?? '');
      } catch {
        // Without clipboard access the text stays visible next to the button to copy by hand.
        if (announcer) announcer.textContent = button.dataset.copyFailed ?? '';
        return;
      }
      const copied = button.dataset.copied ?? '';
      if (label) label.textContent = copied;
      if (announcer) announcer.textContent = copied;
      button.dataset.state = 'copied';
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (label) label.textContent = idle;
        delete button.dataset.state;
      }, COPIED_MS);
    });
  }
}
