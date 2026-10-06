import { sendMail } from './mailer.js';

/*
  Notification sent to the sales team for every new quote request.
  Table-based HTML with inline styles so it renders the same in
  Gmail, Outlook and mobile mail apps; a plain-text version is included.
*/

const LANGUAGE_NAMES = {
  tr: 'Türkçe',
  en: 'İngilizce',
  ar: 'Arapça',
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(date);
}

function adminUrl(id) {
  const origin = (process.env.CLIENT_URL || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)[0];

  return origin ? `${origin.replace(/\/$/, '')}/admin/quotes/${id}` : '';
}

function quoteRows(quote) {
  return [
    ['Firma', quote.company],
    ['Yetkili', quote.name],
    ['E-posta', quote.email, `mailto:${quote.email}`],
    ['Telefon', quote.phone, quote.phone ? `tel:${quote.phone.replace(/[^\d+]/g, '')}` : ''],
    ['Ülke', quote.country],
    ['Ürün', quote.product],
    ['İstenen kapasite', quote.capacity],
    ['Adet', quote.quantity ?? ''],
    ['Uygulama', quote.application],
    ['Site dili', LANGUAGE_NAMES[quote.language] || ''],
  ].filter(([, value]) => value !== '' && value !== null && value !== undefined);
}

export function buildQuoteEmail(quote) {
  const createdAt = formatDate(quote.createdAt || new Date());
  const reference = `RMA-${String(quote._id).slice(-6).toUpperCase()}`;
  const link = adminUrl(quote._id);
  const rows = quoteRows(quote);

  const subject = `Yeni teklif talebi: ${quote.company}${quote.product ? ` – ${quote.product}` : ''}`;

  const rowsHtml = rows
    .map(([label, value, href], index) => {
      const safe = escapeHtml(value);
      const content = href
        ? `<a href="${escapeHtml(href)}" style="color:#d51d2c;text-decoration:none;">${safe}</a>`
        : safe;

      return `
        <tr>
          <td style="padding:12px 16px;width:38%;font-size:13px;color:#6d6f70;border-top:${index ? '1px solid #ecece8' : '0'};vertical-align:top;">${label}</td>
          <td style="padding:12px 16px;font-size:14px;color:#101214;font-weight:600;border-top:${index ? '1px solid #ecece8' : '0'};vertical-align:top;">${content}</td>
        </tr>`;
    })
    .join('');

  const messageHtml = escapeHtml(quote.message).replace(/\r?\n/g, '<br>');

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:Arial,Helvetica,sans-serif;color:#101214;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(quote.name)} (${escapeHtml(quote.company)}) web sitesinden teklif talebi gönderdi.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e3e3df;">

          <tr>
            <td style="background:#0b0d10;padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">RMA <span style="color:#d51d2c;">Plastik</span></td>
                  <td align="right" style="font-size:11px;font-weight:700;color:#9a9c9e;letter-spacing:0.08em;text-transform:uppercase;">${reference}</td>
                </tr>
              </table>
              <p style="margin:22px 0 6px;font-size:11px;font-weight:700;color:#d51d2c;letter-spacing:0.08em;text-transform:uppercase;">Yeni teklif talebi</p>
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;font-weight:600;">${escapeHtml(quote.company)}</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#b5b7b9;">${createdAt}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#6d6f70;letter-spacing:0.08em;text-transform:uppercase;">Talep bilgileri</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ecece8;border-radius:12px;border-collapse:separate;">
                ${rowsHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 8px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#6d6f70;letter-spacing:0.08em;text-transform:uppercase;">Proje detayları</p>
              <div style="padding:16px 18px;background:#f5f5f3;border-radius:12px;border-left:3px solid #d51d2c;font-size:14px;line-height:1.65;color:#101214;">${messageHtml}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#d51d2c;border-radius:10px;">
                    <a href="mailto:${escapeHtml(quote.email)}?subject=${encodeURIComponent(`RMA Plastik teklif talebiniz (${reference})`)}" style="display:inline-block;padding:13px 22px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;">Müşteriye yanıt ver</a>
                  </td>
                  ${link ? `<td style="width:10px;"></td>
                  <td style="border:1px solid #d8d8d4;border-radius:10px;">
                    <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;font-size:13px;font-weight:700;color:#101214;text-decoration:none;">Yönetim panelinde aç</a>
                  </td>` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 32px;background:#fafaf8;border-top:1px solid #ecece8;font-size:12px;line-height:1.6;color:#8a8c8d;">
              Bu e-posta web sitesindeki teklif formundan otomatik olarak gönderilmiştir. Yanıtla dediğinizde e-posta doğrudan müşteriye (${escapeHtml(quote.email)}) gider.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `YENİ TEKLİF TALEBİ – ${reference}`,
    createdAt,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Proje detayları:',
    quote.message,
    '',
    link ? `Yönetim paneli: ${link}` : '',
    `Yanıtlamak için: ${quote.email}`,
  ]
    .filter((line, index, all) => line !== '' || all[index - 1] !== '')
    .join('\n');

  return { subject, html, text };
}

export async function sendQuoteNotification(quote) {
  const to = process.env.QUOTE_NOTIFY_TO;

  if (!to) {
    console.warn('QUOTE_NOTIFY_TO is not set; quote notification skipped.');
    return null;
  }

  const { subject, html, text } = buildQuoteEmail(quote);

  return sendMail({
    to,
    replyTo: { name: quote.name, address: quote.email },
    subject,
    html,
    text,
  });
}
