// Email layout for TaskSync. Plain tables and inline styles so it renders the
// same in Gmail, Outlook, Apple Mail and phone mail apps.
//
// Fonts: Manrope for the heading and button, Inter for everything else
// (both 400/500). Clients that block web fonts fall back to system fonts.

export type Tone = 'brown' | 'moss' | 'terracotta' | 'ochre' | 'slate';

export type Mail = {
  to: string;
  subject: string;
  /** Short label above the heading, e.g. "New task". */
  tag?: string;
  tone?: Tone;
  heading: string;
  /** Inbox preview line (hidden in the body). */
  preheader?: string;
  /** HTML paragraphs; callers escape user content. */
  paragraphs: string[];
  /** Label/value rows shown in a card; values are escaped here. */
  details?: { label: string; value: string }[];
  /** A highlighted quote, e.g. review feedback or a description. */
  quote?: { label?: string; text: string };
  cta?: { label: string; url: string };
  /** One line under the button, e.g. what to do next. */
  note?: string;
};

export const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// "2026-12-01" -> "Tue, Dec 1, 2026" (date-only values, no timezone shift).
export function formatDay(value: string | null | undefined) {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(d);
}

const TONES: Record<Tone, { fg: string; bg: string; bar: string }> = {
  brown: { fg: '#7B3F00', bg: '#F3E7D8', bar: '#7B3F00' },
  moss: { fg: '#4A5A27', bg: '#EAF0DC', bar: '#73883F' },
  terracotta: { fg: '#963D28', bg: '#FBE9E3', bar: '#B04E35' },
  ochre: { fg: '#8F661B', bg: '#FBF1DA', bar: '#B08024' },
  slate: { fg: '#5A4A3B', bg: '#EFE7DC', bar: '#9C8B7A' },
};

const HEADING_FONT = "Manrope,Inter,'Segoe UI',Helvetica,Arial,sans-serif";
const BODY_FONT = "Inter,'Segoe UI',Helvetica,Arial,sans-serif";

export function renderHtml(mail: Mail, opts: { logoUrl: string; appUrl: string }) {
  const tone = TONES[mail.tone ?? 'brown'];

  const tag = mail.tag
    ? `<tr><td style="padding:0 0 14px;">
         <span style="display:inline-block;background:${tone.bg};color:${tone.fg};font-family:${BODY_FONT};font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;padding:5px 10px;border-radius:999px;">${escapeHtml(mail.tag)}</span>
       </td></tr>`
    : '';

  const paragraphs = mail.paragraphs
    .map((p) => `<tr><td style="padding:0 0 14px;font-family:${BODY_FONT};font-size:15px;line-height:1.65;color:#483B31;">${p}</td></tr>`)
    .join('');

  const details = mail.details?.length
    ? `<tr><td style="padding:6px 0 18px;">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F1;border:1px solid #E9DECF;border-radius:12px;">
           ${mail.details.map((d, i) => `
           <tr>
             <td style="padding:12px 16px;${i ? 'border-top:1px solid #EFE6D9;' : ''}font-family:${BODY_FONT};font-size:12px;color:#8A7560;text-transform:uppercase;letter-spacing:0.05em;width:34%;vertical-align:top;">${escapeHtml(d.label)}</td>
             <td style="padding:12px 16px;${i ? 'border-top:1px solid #EFE6D9;' : ''}font-family:${BODY_FONT};font-size:14px;font-weight:500;color:#231C17;vertical-align:top;">${escapeHtml(d.value)}</td>
           </tr>`).join('')}
         </table>
       </td></tr>`
    : '';

  const quote = mail.quote
    ? `<tr><td style="padding:2px 0 18px;">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
           <tr>
             <td style="width:4px;background:${tone.bar};border-radius:4px;"></td>
             <td style="padding:12px 16px;background:${tone.bg};border-radius:0 10px 10px 0;font-family:${BODY_FONT};">
               ${mail.quote.label ? `<div style="font-size:11px;font-weight:500;color:${tone.fg};text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">${escapeHtml(mail.quote.label)}</div>` : ''}
               <div style="font-size:14px;line-height:1.6;color:#3B2E24;white-space:pre-wrap;">${escapeHtml(mail.quote.text)}</div>
             </td>
           </tr>
         </table>
       </td></tr>`
    : '';

  const button = mail.cta
    ? `<tr><td style="padding:10px 0 6px;">
         <table role="presentation" cellpadding="0" cellspacing="0"><tr>
           <td style="background:#7B3F00;border-radius:10px;">
             <a href="${escapeHtml(mail.cta.url)}" style="display:inline-block;padding:13px 26px;font-family:${HEADING_FONT};font-size:15px;font-weight:500;color:#FFFCF8;text-decoration:none;border-radius:10px;">${escapeHtml(mail.cta.label)} &rarr;</a>
           </td>
         </tr></table>
       </td></tr>
       ${mail.note ? `<tr><td style="padding:10px 0 0;font-family:${BODY_FONT};font-size:13px;line-height:1.5;color:#76634F;">${escapeHtml(mail.note)}</td></tr>` : ''}
       <tr><td style="padding:14px 0 0;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:#9A8268;">
         Button not working? Copy this link into your browser:<br>
         <a href="${escapeHtml(mail.cta.url)}" style="color:#7B3F00;word-break:break-all;">${escapeHtml(mail.cta.url)}</a>
       </td></tr>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(mail.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Manrope:wght@400;500&display=swap" rel="stylesheet">
<style>
  strong, b { font-weight: 500; color: #231C17; }
  a { color: #7B3F00; }
  @media (max-width: 600px) {
    .ts-card { padding: 24px 20px !important; }
    .ts-head { padding: 18px 20px !important; }
    .ts-foot { padding: 18px 20px !important; }
    .ts-h1 { font-size: 21px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F6F1E9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(mail.preheader ?? '')}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F1E9;">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
      <tr><td style="height:5px;background:${tone.bar};border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="background:#FFFCF8;border:1px solid #E5D9C6;border-top:0;border-radius:0 0 16px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td class="ts-head" style="padding:22px 32px;border-bottom:1px solid #EFE6D9;">
            <a href="${escapeHtml(opts.appUrl)}" style="text-decoration:none;"><img src="${escapeHtml(opts.logoUrl)}" alt="TaskSync" width="132" style="display:block;width:132px;height:auto;border:0;"></a>
          </td></tr>
          <tr><td class="ts-card" style="padding:30px 32px 30px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${tag}
              <tr><td class="ts-h1" style="padding:0 0 16px;font-family:${HEADING_FONT};font-size:23px;font-weight:500;line-height:1.3;color:#231C17;">${escapeHtml(mail.heading)}</td></tr>
              ${paragraphs}
              ${details}
              ${quote}
              ${button}
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td class="ts-foot" style="padding:20px 32px;text-align:center;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:#9A8268;">
        <span style="font-family:${HEADING_FONT};font-weight:500;color:#76634F;">TaskSync</span> &middot; Group study planner<br>
        You received this because of activity in your TaskSync study groups.<br>
        <a href="${escapeHtml(opts.appUrl)}" style="color:#9A8268;text-decoration:underline;">Open TaskSync</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function renderText(mail: Mail) {
  const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return [
    mail.heading,
    '',
    ...mail.paragraphs.map(strip),
    ...(mail.details?.length ? ['', ...mail.details.map((d) => `${d.label}: ${d.value}`)] : []),
    ...(mail.quote ? ['', `${mail.quote.label ? mail.quote.label + ': ' : ''}"${mail.quote.text}"`] : []),
    ...(mail.cta ? ['', `${mail.cta.label}: ${mail.cta.url}`] : []),
    ...(mail.note ? [mail.note] : []),
    '',
    '— TaskSync, group study planner',
  ].join('\n');
}
