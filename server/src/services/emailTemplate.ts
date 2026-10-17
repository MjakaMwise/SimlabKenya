// One minimal layout shared by every email: white page, logo, plain text, a single brand colour for links.
const SITE_URL = (process.env.SITE_URL || 'https://simlabkenya.co.ke').replace(/\/$/, '');
const BRAND = '#0d5672';
const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const p = (html: string): string =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#222222;">${html}</p>`;

export const h2 = (text: string): string =>
  `<h2 style="margin:28px 0 8px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#666666;">${esc(text)}</h2>`;

/** Label / value rows. Values are trusted HTML, so escape user data before passing it in. */
export const rows = (items: [string, string][]): string =>
  `<table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px;color:#222222;">${items
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 16px 7px 0;color:#666666;vertical-align:top;width:130px;">${esc(k)}</td><td style="padding:7px 0;vertical-align:top;">${v}</td></tr>`
    )
    .join('')}</table>`;

export const button = (href: string, label: string): string =>
  `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 20px;background:${BRAND};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:4px;">${esc(label)}</a>`;

export const link = (href: string, label: string): string =>
  `<a href="${esc(href)}" style="color:${BRAND};">${esc(label)}</a>`;

export const layout = (heading: string, body: string, opts: { footer?: string } = {}): string => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:${FONT};">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td style="padding:24px 12px;">
  <table role="presentation" style="max-width:560px;width:100%;margin:0 auto;background:#ffffff;border:1px solid #e6e6e6;border-collapse:collapse;"><tr><td style="padding:32px;">
    <img src="${SITE_URL}/email-logo.jpeg" alt="SIM-Lab Kenya" width="44" height="44" style="display:block;border:0;border-radius:50%;margin-bottom:24px;">
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#111111;">${esc(heading)}</h1>
    ${body}
  </td></tr></table>
  <p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#888888;text-align:center;">${opts.footer ?? 'SIM-Lab Kenya &middot; Science in Motion<br>IOME001 Innovation Hub, Mombasa, Kenya'}</p>
</td></tr></table>
</body></html>`;
