/**
 * The Intro Call booking form: loads free Slots when the form comes into view, shows them a week
 * at a time as day and time radio buttons in the Visitor's time zone, and books one through
 * /api/booking. Step 1 picks the time, step 2 asks for the details. Validation, Turnstile and
 * sending are shared with the Message form (form-client.ts); the calendar logic lives in
 * booking-calendar.ts.
 */
import { calendarWeeks, dateOf, firstWeekWithSlots, groupByDay } from './booking-calendar';
import { setUpContactForm } from './form-client';

interface PickerCopy {
  zone: string;
  loading: string;
  weekEmpty: string;
  empty: string;
  loadFailed: string;
  sentText: string;
}

/** Start loading Slots a little before the form scrolls into view. */
const PRELOAD_MARGIN = '400px';

const form = document.querySelector<HTMLFormElement>('[data-booking-form]');
if (form) setUp(form);

function setUp(form: HTMLFormElement): void {
  const copy = JSON.parse(form.dataset.picker ?? '{}') as PickerCopy;
  const status = JSON.parse(form.dataset.status ?? '{}') as Record<string, string>;
  const locale = form.dataset.locale ?? 'de';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const find = <T extends HTMLElement>(selector: string) => form.querySelector<T>(selector);
  const days = find('[data-days]');
  const times = find('[data-times]');
  const state = find('[data-picker-state]');
  const week = find('[data-week]');
  const range = find('[data-week-range]');
  const previous = find<HTMLButtonElement>('[data-week-previous]');
  const next = find<HTMLButtonElement>('[data-week-next]');
  const chosen = find('[data-chosen]');
  const start = find<HTMLInputElement>('input[name="start"]');
  if (!days || !times || !state || !week || !range || !previous || !next || !start) return;

  const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone });
  // Day keys are formatted as midnight UTC, so these use UTC on purpose.
  const dayName = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  const dayNumber = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' });
  const dayRange = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
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
  let weeks: string[][] = [];
  let page = 0;

  const showStep = (step: 'pick' | 'details') => {
    form.dataset.step = step;
  };

  // Callbacks run long after setup, when `load` below exists.
  const contactForm = setUpContactForm(form, {
    prefix: 'booking',
    fields: ['start', 'name', 'email', 'company', 'reason', 'link', 'consent'],
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
        link: text('link'),
        consent: data.get('consent') === 'on',
      };
    },
    onSuccess: () => {
      const sentText = form.parentElement?.querySelector('[data-sent-text]');
      if (sentText)
        sentText.textContent = copy.sentText.replace('{slot}', full.format(new Date(start.value)));
    },
    // Someone else took the Slot: back to step 1 with what is free now.
    onError: (code) => {
      if (code !== 'slot_unavailable') return;
      showStep('pick');
      void load(status.slot_unavailable);
    },
  });

  // "example.com/jobs/42" means a web address, so the scheme is added rather than refused.
  // `change` fires before `blur`, so the field is validated with the completed link.
  const link = find<HTMLInputElement>('input[name="link"]');
  link?.addEventListener('change', () => {
    const value = link.value.trim();
    if (value && !/^[a-z][a-z\d+.-]*:/i.test(value)) link.value = `https://${value}`;
  });

  // A chosen time stays chosen only while its day is shown, so "Continue" never books a time
  // the Visitor cannot see.
  const showTimes = (day: string) => {
    const daySlots = slotsByDay.get(day) ?? [];
    if (!daySlots.includes(start.value)) start.value = '';
    times.replaceChildren(
      ...daySlots.map((slot) =>
        option('slot', slot, [clock.format(new Date(slot))], slot === start.value, () => {
          start.value = slot;
          contactForm.validate('start');
        }),
      ),
    );
  };

  const showWeek = (index: number) => {
    page = index;
    const shown = weeks[page] ?? [];
    const first = shown[0];
    const last = shown.at(-1);
    if (first && last) range.textContent = dayRange.formatRange(dateOf(first), dateOf(last));
    previous.disabled = page === 0;
    next.disabled = page >= weeks.length - 1;
    // Back on the week of the chosen time, its day opens again.
    const open =
      shown.find((day) => slotsByDay.get(day)?.includes(start.value)) ??
      shown.find((day) => slotsByDay.has(day));
    days.replaceChildren(
      ...shown.map((day) => {
        const date = dateOf(day);
        const chip = option(
          'day',
          day,
          [dayName.format(date), dayNumber.format(date)],
          day === open,
          () => showTimes(day),
        );
        chip.querySelector('input')?.toggleAttribute('disabled', !slotsByDay.has(day));
        return chip;
      }),
    );
    state.textContent = open ? '' : copy.weekEmpty;
    if (open) showTimes(open);
    else {
      start.value = '';
      times.replaceChildren();
    }
  };

  const render = (slots: string[]) => {
    slotsByDay = groupByDay(slots, (slot) => dayKey.format(new Date(slot)));
    weeks = calendarWeeks(dayKey.format(new Date()), slotsByDay);
    start.value = '';
    week.hidden = weeks.length === 0;
    if (weeks.length === 0) {
      days.replaceChildren();
      times.replaceChildren();
      state.textContent = copy.empty;
      return;
    }
    showWeek(firstWeekWithSlots(weeks, slotsByDay));
  };

  /** Loads the Slots; a notice (e.g. that a time was just taken) is shown and focused after. */
  const load = async (notice = '') => {
    state.textContent = copy.loading;
    try {
      const response = await fetch('/api/slots');
      if (!response.ok) throw new Error(`Slots answered ${response.status}`);
      const body = (await response.json()) as { slots?: string[] };
      render(body.slots ?? []);
      if (notice) state.textContent = notice;
    } catch {
      week.hidden = true;
      days.replaceChildren();
      times.replaceChildren();
      state.textContent = [notice, copy.loadFailed].filter(Boolean).join(' ');
    }
    if (notice) state.focus();
  };

  previous.addEventListener('click', () => showWeek(page - 1));
  next.addEventListener('click', () => showWeek(page + 1));

  find('[data-step-next]')?.addEventListener('click', () => {
    if (!contactForm.validate('start')) {
      (find('[data-times] input') ?? find('[data-days] input:not(:disabled)'))?.focus();
      return;
    }
    if (chosen) chosen.textContent = full.format(new Date(start.value));
    showStep('details');
    find('input[name="name"]')?.focus();
  });

  find('[data-step-back]')?.addEventListener('click', () => {
    showStep('pick');
    (find('[data-times] input:checked') ?? find('[data-days] input:checked'))?.focus();
  });

  const zone = find('[data-zone]');
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
