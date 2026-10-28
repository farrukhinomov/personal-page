/**
 * The Intro Call booking form: loads free Slots when the section comes near, shows them as day
 * and time radio buttons in the Visitor's time zone, and books one through /api/booking.
 * Validation, Turnstile and sending are shared with the Message form (form-client.ts).
 */
import { setUpContactForm } from './form-client';

interface PickerCopy {
  zone: string;
  loading: string;
  empty: string;
  loadFailed: string;
  sentText: string;
}

/** Start loading Slots a little before the section scrolls into view. */
const PRELOAD_MARGIN = '400px';

const form = document.querySelector<HTMLFormElement>('[data-booking-form]');
if (form) setUp(form);

function setUp(form: HTMLFormElement): void {
  const copy = JSON.parse(form.dataset.picker ?? '{}') as PickerCopy;
  const locale = form.dataset.locale ?? 'de';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const days = form.querySelector<HTMLElement>('[data-days]');
  const times = form.querySelector<HTMLElement>('[data-times]');
  const state = form.querySelector<HTMLElement>('[data-picker-state]');
  const zone = form.querySelector<HTMLElement>('[data-zone]');
  const start = form.querySelector<HTMLInputElement>('input[name="start"]');
  if (!days || !times || !state || !start) return;

  const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone });
  const dayName = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone });
  const dayDate = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', timeZone });
  const clock = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone });
  const full = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });

  let slotsByDay = new Map<string, string[]>();
  // Callbacks run long after setup, when `load` below exists.
  const contactForm = setUpContactForm(form, {
    prefix: 'booking',
    fields: ['start', 'name', 'email', 'company', 'reason', 'consent'],
    endpoint: '/api/booking',
    values: (data) => {
      const text = (name: string) => String(data.get(name) ?? '').trim();
      return {
        start: text('start'),
        timeZone,
        name: text('name'),
        email: text('email'),
        company: text('company'),
        reason: text('reason'),
        consent: data.get('consent') === 'on',
      };
    },
    onSuccess: () => {
      const sentText = form.parentElement?.querySelector('[data-sent-text]');
      if (sentText)
        sentText.textContent = copy.sentText.replace('{slot}', full.format(new Date(start.value)));
    },
    // Someone else took the Slot: show what is free now.
    onError: (code) => {
      if (code === 'slot_unavailable') void load();
    },
  });

  const choose = (slot: string) => {
    start.value = slot;
    contactForm.validate('start');
  };

  const showTimes = (day: string) => {
    times.replaceChildren(
      ...(slotsByDay.get(day) ?? []).map((slot) =>
        option('slot', slot, [clock.format(new Date(slot))], slot === start.value, () =>
          choose(slot),
        ),
      ),
    );
  };

  const render = (slots: string[]) => {
    slotsByDay = groupByDay(slots, dayKey);
    start.value = '';
    if (slotsByDay.size === 0) {
      days.replaceChildren();
      times.replaceChildren();
      state.textContent = copy.empty;
      return;
    }
    state.textContent = '';
    const first = [...slotsByDay.keys()][0] ?? '';
    days.replaceChildren(
      ...[...slotsByDay.entries()].map(([day, daySlots]) => {
        const date = new Date(daySlots[0] ?? '');
        return option('day', day, [dayName.format(date), dayDate.format(date)], day === first, () =>
          showTimes(day),
        );
      }),
    );
    showTimes(first);
  };

  const load = async () => {
    state.textContent = copy.loading;
    try {
      const response = await fetch('/api/slots');
      if (!response.ok) throw new Error(`Slots answered ${response.status}`);
      const body = (await response.json()) as { slots?: string[] };
      render(body.slots ?? []);
    } catch {
      days.replaceChildren();
      times.replaceChildren();
      state.textContent = copy.loadFailed;
    }
  };

  if (zone) zone.textContent = copy.zone.replace('{zone}', timeZone);

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void load();
    },
    { rootMargin: PRELOAD_MARGIN },
  );
  observer.observe(form);
}

/** Slot starts grouped by the Visitor's calendar day, in time order. */
function groupByDay(slots: string[], dayKey: Intl.DateTimeFormat): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const slot of [...slots].sort()) {
    const day = dayKey.format(new Date(slot));
    groups.set(day, [...(groups.get(day) ?? []), slot]);
  }
  return groups;
}

/** A radio button that looks like a chip: the label is the visible control. */
function option(
  name: 'day' | 'slot',
  value: string,
  lines: string[],
  checked: boolean,
  onChoose: () => void,
): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = `option ${name}`;
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.checked = checked;
  input.addEventListener('change', onChoose);
  label.append(input);
  lines.forEach((line, index) => {
    const span = document.createElement('span');
    if (name === 'day') span.className = index === 0 ? 'day-name' : 'day-date';
    span.textContent = line;
    label.append(span);
  });
  return label;
}
