import { describe, expect, it } from 'vitest';
import { FORM_COPY } from './form-copy';

/** Every key of an object tree, as dotted paths. */
function keys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? keys(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('FORM_COPY', () => {
  it('has the same texts in German and English, none of them empty', () => {
    expect(keys(FORM_COPY.de)).toEqual(keys(FORM_COPY.en));
    for (const locale of ['de', 'en'] as const) {
      expect(JSON.stringify(FORM_COPY[locale])).not.toContain('""');
    }
  });
});
