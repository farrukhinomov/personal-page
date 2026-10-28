/** The Message form on the Contact page; shared behaviour lives in form-client.ts. */
import { setUpContactForm } from './form-client';

const form = document.querySelector<HTMLFormElement>('[data-message-form]');

if (form) {
  setUpContactForm(form, {
    prefix: 'message',
    fields: ['name', 'email', 'company', 'topic', 'message', 'consent'],
    endpoint: '/api/message',
    values: (data) => {
      const text = (name: string) => String(data.get(name) ?? '').trim();
      return {
        name: text('name'),
        email: text('email'),
        company: text('company'),
        topic: text('topic'),
        message: text('message'),
        consent: data.get('consent') === 'on',
      };
    },
  });

  const message = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
  const count = form.querySelector<HTMLElement>('[data-count]');
  message?.addEventListener('input', () => {
    if (count) count.textContent = `${message.value.length} / ${message.maxLength}`;
  });
}
