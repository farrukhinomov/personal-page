import type { Confirmation } from './confirmation';

/**
 * The confirmation as an HTML email: a light card in the site's slate and teal, built from tables
 * and inline styles because mail apps ignore most of modern CSS. No images, web fonts or tracking:
 * images are often blocked, web fonts rarely load, and the plain-text part says the same.
 */

/** Light theme tokens from src/styles/tokens.css; mail apps have no dark theme switch to follow. */
const COLOR = {
  page: '#eef2f5',
  card: '#ffffff',
  line: '#d3dde3',
  text: '#0f1e28',
  muted: '#4b6170',
  signal: '#08707f',
  signalTint: '#e6f2f4',
  onSignal: '#ffffff',
} as const;

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

const paragraph = (html: string, margin = '0 0 16px') =>
  `<p style="margin:${margin};font:16px/1.6 ${FONT};color:${COLOR.text};">${html}</p>`;

const link = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="color:${COLOR.signal};text-decoration:none;font-weight:600;">${escapeHtml(label)}</a>`;

function statusPanel(c: Confirmation): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.signalTint};border-radius:10px;">
  <tr>
    <td width="32" valign="top" style="padding:16px 0 16px 18px;">
      <div style="width:28px;height:28px;border-radius:14px;background:${COLOR.signal};color:${COLOR.onSignal};font:700 16px/28px ${FONT};text-align:center;">&#10003;</div>
    </td>
    <td style="padding:16px 18px 16px 14px;">
      <div style="font:600 15px/1.4 ${FONT};color:${COLOR.text};">${escapeHtml(c.status)}</div>
      <div style="font:14px/1.5 ${FONT};color:${COLOR.muted};">${escapeHtml(c.topicLabel)}: ${escapeHtml(c.topic)}</div>
    </td>
  </tr>
</table>`;
}

function signature(c: Confirmation): string {
  const { name, headline, website, linkedin } = c.signature;
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid ${COLOR.line};">
  <tr>
    <td style="padding-top:20px;">
      <div style="font:700 16px/1.4 ${FONT};color:${COLOR.text};">${escapeHtml(name)}</div>
      <div style="font:14px/1.5 ${FONT};color:${COLOR.muted};">${escapeHtml(headline)}</div>
      <div style="padding-top:10px;font:14px/1.5 ${FONT};">
        ${link(website, new URL(website).host)}&nbsp;&nbsp;&nbsp;&nbsp;${link(linkedin, 'LinkedIn')}
      </div>
    </td>
  </tr>
</table>`;
}

export function confirmationHtml(c: Confirmation): string {
  const intro = escapeHtml(`${c.intro.before}${c.topic}${c.intro.after}`);
  return `<!doctype html>
<html lang="${c.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(c.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.page};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="padding:0 4px 16px;font:700 15px/1.4 ${FONT};color:${COLOR.text};letter-spacing:-0.01em;">${escapeHtml(c.signature.name)}</td>
          <td align="right" style="padding:0 4px 16px;font:14px/1.4 ${FONT};">${link(c.signature.website, new URL(c.signature.website).host)}</td>
        </tr>
        <tr>
          <td colspan="2" style="background:${COLOR.card};border:1px solid ${COLOR.line};border-top:4px solid ${COLOR.signal};border-radius:14px;padding:32px 32px 28px;">
            ${statusPanel(c)}
            ${paragraph(escapeHtml(c.greeting), '28px 0 16px')}
            ${paragraph(intro)}
            ${paragraph(escapeHtml(c.followUp))}
            ${paragraph(escapeHtml(c.closing), '24px 0 0')}
            ${signature(c)}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:20px 8px 0;font:12px/1.6 ${FONT};color:${COLOR.muted};">${escapeHtml(c.notice)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
