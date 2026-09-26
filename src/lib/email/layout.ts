import "server-only";

// Inlined rather than read from the token files: an email client gets one stylesheet,
// in a <style> block or on the element, and no custom properties.
const OXBLOOD = "#5C0D00";
const CREAM = "#FFFAE8";
const INK = "#000032";
const MUTED = "#7a7268";

export type Action = { href: string; label: string };

/** The one envelope every email goes out in, so a delivery note and a receipt are
 * visibly from the same shop. */
export function shell(input: {
  heading: string;
  body: string;
  action?: Action;
  footnote?: string;
}) {
  const { heading, body, action, footnote } = input;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${heading}</title></head>
<body style="margin:0;padding:0;background:${CREAM};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="background:${OXBLOOD};padding:28px 32px;">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:.14em;color:${CREAM};">ȘÈDÁ</span>
        </td></tr>
        <tr><td style="background:#fff;padding:32px;">
          <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:${INK};">${heading}</h1>
          <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#3a3a3a;">${body}</div>
          ${
            action
              ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                   <tr><td style="background:${OXBLOOD};">
                     <a href="${action.href}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:${CREAM};text-decoration:none;">${action.label}</a>
                   </td></tr>
                 </table>`
              : ""
          }
          ${
            footnote
              ? `<p style="margin:24px 0 0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${MUTED};">${footnote}</p>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:20px 32px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
          Șèdá · Lagos, Nigeria
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Money and line items appear in two of the three customer emails. */
export function itemsTable(
  items: { productName: string; colourName: string; size: string; quantity: number }[],
) {
  return `<ul style="margin:0 0 4px;padding:0 0 0 18px;">${items
    .map(
      (item) =>
        `<li style="margin:0 0 6px;">${item.productName} — ${item.colourName}, size ${item.size} ×${item.quantity}</li>`,
    )
    .join("")}</ul>`;
}
