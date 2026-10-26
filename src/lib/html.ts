/** JSON escape for "<", built from parts so no tool or compiler can turn it into a literal "<". */
const ESCAPED_LESS_THAN = '\\' + 'u003c';

/**
 * Serialises a value as JSON that is safe inside an HTML <script> element:
 * every "<" is escaped, so the content can never close the tag or open a new one.
 */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', ESCAPED_LESS_THAN);
}
