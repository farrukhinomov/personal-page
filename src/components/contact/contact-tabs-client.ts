/**
 * The switch between writing a message and booking an intro call on the Contact page, as an
 * ARIA tab list: arrow keys, Home and End move between the tabs, and the URL hash
 * (#message, #intro-call) opens a tab directly and is kept up to date.
 */
const list = document.querySelector<HTMLElement>('[data-tabs]');
if (list) setUp(list);

function setUp(list: HTMLElement): void {
  const tabs = [...list.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  const panelOf = (tab: HTMLButtonElement) => document.getElementById(tab.dataset.tab ?? '');

  for (const tab of tabs) {
    const panel = panelOf(tab);
    panel?.setAttribute('role', 'tabpanel');
    panel?.setAttribute('aria-labelledby', tab.id);
  }

  const select = (chosen: HTMLButtonElement, { focus = false, remember = false } = {}) => {
    for (const tab of tabs) {
      const active = tab === chosen;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panelOf(tab)?.toggleAttribute('data-active', active);
    }
    if (focus) chosen.focus();
    if (remember) history.replaceState(null, '', `#${chosen.dataset.tab}`);
  };

  // No hash means the first tab. Other hashes, like the skip link's #main, leave the tab alone.
  const fromHash = () => {
    const tab = location.hash
      ? tabs.find((candidate) => `#${candidate.dataset.tab}` === location.hash)
      : tabs[0];
    if (tab) select(tab);
  };

  list.addEventListener('click', (event) => {
    const tab = (event.target as Element).closest<HTMLButtonElement>('[data-tab]');
    if (tab) select(tab, { remember: true });
  });

  list.addEventListener('keydown', (event) => {
    const current = tabs.findIndex((tab) => tab === document.activeElement);
    const target = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (target === undefined || current < 0) return;
    event.preventDefault();
    const tab = tabs[(target + tabs.length) % tabs.length];
    if (tab) select(tab, { focus: true, remember: true });
  });

  window.addEventListener('hashchange', fromHash);
  fromHash();
}
