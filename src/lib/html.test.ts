import { describe, expect, it } from 'vitest';
import { jsonForScript } from './html';

describe('jsonForScript', () => {
  it('escapes every "<" so the JSON cannot close its script tag', () => {
    const json = jsonForScript({ a: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('<');
    expect(json).toContain(String.fromCharCode(92) + 'u003c/script>'); // 92 = backslash
  });

  it('round-trips to the same value', () => {
    const value = { text: 'a < b', list: [1, '<'] };
    expect(JSON.parse(jsonForScript(value))).toEqual(value);
  });
});
