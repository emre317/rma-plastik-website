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

function siteOrigin() {
  const origin = (process.env.CLIENT_URL || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)[0];

  return origin ? origin.replace(/\/$/, '') : '';
}

function adminUrl(id) {
  const origin = siteOrigin();

  return origin ? `${origin}/admin/quotes/${id}` : '';
}

function quoteRows(quote) {
  return [
    ['Firma', quote.company],
    ['Yetkili', quote.name],
    ['E-posta', quote.email, `mailto:${quote.email}`],
    ['Telefon', quote.phone, quote.phone ? `tel:${quote.phone.replace(/[^\d+]/g, '')}` : ''],
    ['Ülke', quote.country],
    ['Ürün', quote.product],
    ['Ürün detayı', quote.productDetails],
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
        ? `<a href="${escapeHtml(href)}" style="color:#1d67d5;text-decoration:none;">${safe}</a>`
        : safe;

      return `
        <tr>
          <td style="padding:12px 16px;width:38%;font-size:13px;color:#5d6980;border-top:${index ? '1px solid #e2e7f2' : '0'};vertical-align:top;">${label}</td>
          <td style="padding:12px 16px;font-size:14px;color:#112244;font-weight:600;border-top:${index ? '1px solid #e2e7f2' : '0'};vertical-align:top;">${content}</td>
        </tr>`;
    })
    .join('');

  const messageHtml = escapeHtml(quote.message).replace(/\r?\n/g, '<br>');

  // Photo of the selected catalogue model (needs CLIENT_URL for an absolute link)
  const imageUrl = quote.productImage && siteOrigin() ? `${siteOrigin()}${quote.productImage}` : '';
  const itemsHtml = (quote.items || []).length
    ? `
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#5d6980;letter-spacing:0.08em;text-transform:uppercase;">Teklif sepeti (${quote.items.length} ürün)</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e7f2;border-radius:12px;border-collapse:separate;">
                ${quote.items
                  .map((item, index) => {
                    const src = item.image && siteOrigin() ? `${siteOrigin()}${item.image}` : '';
                    const border = index ? 'border-top:1px solid #e2e7f2;' : '';
                    return `
                <tr>
                  <td style="padding:12px;width:64px;${border}vertical-align:top;">${src ? `<img src="${escapeHtml(src)}" alt="" width="56" style="display:block;width:56px;border-radius:8px;background:#f2f2f2;">` : ''}</td>
                  <td style="padding:12px 12px 12px 0;${border}font-size:13px;color:#112244;vertical-align:top;"><strong style="font-size:14px;">${escapeHtml(item.name)}</strong><br><span style="color:#5d6980;">${escapeHtml(item.details)}</span></td>
                  <td align="right" style="padding:12px 16px;${border}font-size:15px;font-weight:700;color:#1d67d5;white-space:nowrap;vertical-align:top;">× ${escapeHtml(item.quantity)}</td>
                </tr>`;
                  })
                  .join('')}
              </table>
            </td>
          </tr>`
    : '';

  const imageHtml = imageUrl
    ? `
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#5d6980;letter-spacing:0.08em;text-transform:uppercase;">Seçilen ürün</p>
              <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(quote.product)}" width="180" style="display:block;width:180px;max-width:100%;border-radius:12px;background:#f2f2f2;">
            </td>
          </tr>`
    : '';

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f3f8;font-family:Arial,Helvetica,sans-serif;color:#112244;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(quote.name)} (${escapeHtml(quote.company)}) web sitesinden teklif talebi gönderdi.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f3f8;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dadfe8;">

          <tr>
            <td style="background:#0f1e3c;padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">RMA <span style="color:#1d67d5;">Plastik</span></td>
                  <td align="right" style="font-size:11px;font-weight:700;color:#8c97ac;letter-spacing:0.08em;text-transform:uppercase;">${reference}</td>
                </tr>
              </table>
              <p style="margin:22px 0 6px;font-size:11px;font-weight:700;color:#1d67d5;letter-spacing:0.08em;text-transform:uppercase;">Yeni teklif talebi</p>
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;font-weight:600;">${escapeHtml(quote.company)}</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#abb3c3;">${createdAt}</p>
            </td>
          </tr>

${imageHtml}${itemsHtml}
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#5d6980;letter-spacing:0.08em;text-transform:uppercase;">Talep bilgileri</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e7f2;border-radius:12px;border-collapse:separate;">
                ${rowsHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 8px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#5d6980;letter-spacing:0.08em;text-transform:uppercase;">Proje detayları</p>
              <div style="padding:16px 18px;background:#f0f3f8;border-radius:12px;border-left:3px solid #1d67d5;font-size:14px;line-height:1.65;color:#112244;">${messageHtml}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1d67d5;border-radius:10px;">
                    <a href="mailto:${escapeHtml(quote.email)}?subject=${encodeURIComponent(`RMA Plastik teklif talebiniz (${reference})`)}" style="display:inline-block;padding:13px 22px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;">Müşteriye yanıt ver</a>
                  </td>
                  ${link ? `<td style="width:10px;"></td>
                  <td style="border:1px solid #ccd3e0;border-radius:10px;">
                    <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;font-size:13px;font-weight:700;color:#112244;text-decoration:none;">Yönetim panelinde aç</a>
                  </td>` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 32px;background:#f7f8fb;border-top:1px solid #e2e7f2;font-size:12px;line-height:1.6;color:#79859e;">
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
    ...((quote.items || []).length
      ? ['Teklif sepeti:', ...quote.items.map((item) => `- ${item.name} × ${item.quantity}${item.details ? ` (${item.details})` : ''}`), '']
      : []),
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
