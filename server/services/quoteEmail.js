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
  const reference = quoteReference(quote._id);
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

/* ---------- Confirmation sent to the customer (tr / en / ar) ---------- */

export const quoteReference = (id) => `RMA-${String(id).slice(-6).toUpperCase()}`;

// Shown when the admin has not saved contact details (same as client/src/data/company.js)
const DEFAULT_CONTACT = {
  phoneDisplay: '+90 (324) 676 4500',
  phone: '+903246764500',
  email: 'info@rmaplastik.com',
};

const CONFIRM_TEXT = {
  tr: {
    locale: 'tr-TR',
    subject: (ref) => `Teklif talebiniz alındı – ${ref}`,
    preheader: 'Talebiniz satış ekibimize ulaştı.',
    eyebrow: 'Talebiniz alındı',
    greeting: (name) => `Sayın ${name},`,
    intro: 'RMA Plastik’e gösterdiğiniz ilgi için teşekkür ederiz. Teklif talebiniz satış ekibimize ulaştı. Talebinizi inceleyip en kısa sürede sizinle iletişime geçeceğiz.',
    reference: 'Referans numaranız',
    referenceHint: 'Bizimle iletişime geçtiğinizde bu numarayı belirtmeniz yeterli.',
    summary: 'Talep özeti',
    company: 'Firma',
    country: 'Ülke',
    product: 'Ürün / konu',
    quantity: 'Adet',
    capacity: 'İstenen kapasite',
    date: 'Talep tarihi',
    general: 'Genel talep',
    reply: 'Eklemek istediğiniz bilgi, çizim veya ölçü varsa bu e-postayı yanıtlayabilirsiniz.',
    contact: 'Bize ulaşın',
    footer: (site) => `Bu e-posta${site ? ` ${site} adresindeki` : ''} teklif formunu doldurduğunuz için gönderilmiştir. Bu talebi siz göndermediyseniz e-postayı dikkate almayın.`,
  },
  en: {
    locale: 'en-GB',
    subject: (ref) => `We have received your quote request – ${ref}`,
    preheader: 'Your request has reached our sales team.',
    eyebrow: 'Request received',
    greeting: (name) => `Dear ${name},`,
    intro: 'Thank you for your interest in RMA Plastik. Your quote request has reached our sales team. We will review it and get back to you as soon as possible.',
    reference: 'Your reference number',
    referenceHint: 'Please quote this number whenever you contact us.',
    summary: 'Request summary',
    company: 'Company',
    country: 'Country',
    product: 'Product / subject',
    quantity: 'Quantity',
    capacity: 'Required capacity',
    date: 'Request date',
    general: 'General enquiry',
    reply: 'If you would like to add details, drawings or dimensions, simply reply to this email.',
    contact: 'Contact us',
    footer: (site) => `You are receiving this email because you submitted the quote form${site ? ` on ${site}` : ''}. If you did not send this request, please ignore this email.`,
  },
  ar: {
    locale: 'ar',
    dir: 'rtl',
    subject: (ref) => `تم استلام طلب عرض السعر – ${ref}`,
    preheader: 'وصل طلبك إلى فريق المبيعات لدينا.',
    eyebrow: 'تم استلام طلبك',
    greeting: (name) => `السيد/السيدة ${name}،`,
    intro: 'نشكركم على اهتمامكم بـ RMA Plastik. وصل طلب عرض السعر الخاص بكم إلى فريق المبيعات لدينا، وسنقوم بدراسته والتواصل معكم في أقرب وقت ممكن.',
    reference: 'رقمكم المرجعي',
    referenceHint: 'يرجى ذكر هذا الرقم عند التواصل معنا.',
    summary: 'ملخص الطلب',
    company: 'الشركة',
    country: 'الدولة',
    product: 'المنتج / الموضوع',
    quantity: 'الكمية',
    capacity: 'السعة المطلوبة',
    date: 'تاريخ الطلب',
    general: 'طلب عام',
    reply: 'إذا رغبتم في إضافة معلومات أو رسومات أو مقاسات، يمكنكم الرد على هذا البريد الإلكتروني.',
    contact: 'تواصلوا معنا',
    footer: (site) => `تم إرسال هذا البريد لأنكم قمتم بتعبئة نموذج طلب عرض السعر${site ? ` على ${site}` : ''}. إذا لم تقوموا بإرسال هذا الطلب، يرجى تجاهل هذه الرسالة.`,
  },
};

export function isCustomerConfirmationEnabled() {
  return process.env.QUOTE_CONFIRM_CUSTOMER !== 'false';
}

export function buildCustomerConfirmation(quote, contact = {}) {
  const lang = CONFIRM_TEXT[quote.language] ? quote.language : 'en';
  const copy = CONFIRM_TEXT[lang];
  const dir = copy.dir || 'ltr';
  const align = dir === 'rtl' ? 'right' : 'left';
  const reference = quoteReference(quote._id);
  const origin = siteOrigin();
  const site = origin.replace(/^https?:\/\//, '');
  const phoneDisplay = contact.phoneDisplay || DEFAULT_CONTACT.phoneDisplay;
  const phone = (contact.phone || DEFAULT_CONTACT.phone).replace(/[^\d+]/g, '');
  const email = contact.email || DEFAULT_CONTACT.email;

  // The customer's free-text message is not echoed back (the form must not become a way to mail arbitrary text)
  const name = String(quote.name || '').slice(0, 80);
  const items = (quote.items || []).slice(0, 30);
  const date = new Intl.DateTimeFormat(copy.locale, { dateStyle: 'long', timeZone: 'Europe/Istanbul' }).format(quote.createdAt || new Date());

  const rows = [
    [copy.company, quote.company],
    // Countries are stored with their Turkish name
    [copy.country, lang === 'tr' ? quote.country : ''],
    ...(items.length ? [] : [
      [copy.product, quote.product || copy.general],
      [copy.capacity, quote.capacity],
      [copy.quantity, quote.quantity ?? ''],
    ]),
    [copy.date, date],
  ].filter(([, value]) => value !== '' && value !== null && value !== undefined);

  const cell = `padding:11px 16px;font-size:14px;vertical-align:top;text-align:${align};`;

  const rowsHtml = rows
    .map(([label, value], index) => `
                <tr>
                  <td style="${cell}width:40%;color:#5d6980;font-size:13px;border-top:${index ? '1px solid #e2e7f2' : '0'};">${escapeHtml(label)}</td>
                  <td style="${cell}color:#112244;font-weight:600;border-top:${index ? '1px solid #e2e7f2' : '0'};">${escapeHtml(value)}</td>
                </tr>`)
    .join('');

  const itemsHtml = items.length
    ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;border:1px solid #e2e7f2;border-radius:12px;border-collapse:separate;">
                ${items
                  .map((item, index) => {
                    const src = item.image && origin ? `${origin}${item.image}` : '';
                    const border = index ? 'border-top:1px solid #e2e7f2;' : '';
                    return `
                <tr>
                  <td style="padding:10px 12px;width:52px;${border}vertical-align:top;">${src ? `<img src="${escapeHtml(src)}" alt="" width="44" style="display:block;width:44px;border-radius:8px;background:#f2f2f2;">` : ''}</td>
                  <td style="padding:10px 4px;${border}font-size:14px;font-weight:600;color:#112244;vertical-align:middle;text-align:${align};">${escapeHtml(item.name)}</td>
                  <td style="padding:10px 16px;${border}font-size:14px;font-weight:700;color:#1d67d5;white-space:nowrap;vertical-align:middle;text-align:${dir === 'rtl' ? 'left' : 'right'};"><span dir="ltr" style="unicode-bidi:isolate;">× ${escapeHtml(item.quantity || 1)}</span></td>
                </tr>`;
                  })
                  .join('')}
              </table>`
    : '';

  const subject = copy.subject(reference);

  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f3f8;font-family:Arial,Helvetica,sans-serif;color:#112244;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f3f8;padding:32px 12px;" dir="${dir}">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dadfe8;">

          <tr>
            <td style="background:#0f1e3c;padding:28px 32px;text-align:${align};">
              <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;" dir="ltr">RMA <span style="color:#1d67d5;">Plastik</span></div>
              <p style="margin:22px 0 6px;font-size:12px;font-weight:700;color:#5b9cf5;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(copy.eyebrow)}</p>
              <h1 style="margin:0;font-size:22px;line-height:1.35;color:#ffffff;font-weight:600;">${escapeHtml(copy.greeting(name))}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 32px 4px;text-align:${align};">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#112244;">${escapeHtml(copy.intro)}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4fe;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;text-align:${align};">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#5d6980;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(copy.reference)}</p>
                    <p style="margin:0;font-size:26px;font-weight:700;color:#1d67d5;letter-spacing:0.04em;" dir="ltr">${reference}</p>
                    <p style="margin:6px 0 0;font-size:13px;color:#5d6980;">${escapeHtml(copy.referenceHint)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 32px 4px;text-align:${align};">
              <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#5d6980;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(copy.summary)}</p>
              ${itemsHtml}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e7f2;border-radius:12px;border-collapse:separate;">
                ${rowsHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 6px;text-align:${align};">
              <p style="margin:0;font-size:14px;line-height:1.65;color:#112244;">${escapeHtml(copy.reply)}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 32px 30px;text-align:${align};">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#5d6980;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(copy.contact)}</p>
              <p style="margin:0;font-size:14px;line-height:1.9;">
                <a href="tel:${escapeHtml(phone)}" style="color:#1d67d5;text-decoration:none;font-weight:700;" dir="ltr">${escapeHtml(phoneDisplay)}</a><br>
                <a href="mailto:${escapeHtml(email)}" style="color:#1d67d5;text-decoration:none;font-weight:700;">${escapeHtml(email)}</a>${origin ? `<br>
                <a href="${escapeHtml(origin)}" style="color:#1d67d5;text-decoration:none;font-weight:700;">${escapeHtml(site)}</a>` : ''}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 32px;background:#f7f8fb;border-top:1px solid #e2e7f2;font-size:12px;line-height:1.6;color:#79859e;text-align:${align};">
              ${escapeHtml(copy.footer(site))}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    copy.greeting(name),
    '',
    copy.intro,
    '',
    `${copy.reference}: ${reference}`,
    copy.referenceHint,
    '',
    `${copy.summary}:`,
    ...items.map((item) => `- ${item.name} × ${item.quantity || 1}`),
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    copy.reply,
    '',
    `${copy.contact}: ${phoneDisplay} · ${email}${site ? ` · ${site}` : ''}`,
    '',
    copy.footer(site),
  ].join('\n');

  return { subject, html, text };
}

export async function sendQuoteConfirmation(quote, contact = {}) {
  if (!isCustomerConfirmationEnabled()) return null;

  const { subject, html, text } = buildCustomerConfirmation(quote, contact);

  // Replies go to the sales team, not to the sending mailbox
  const replyTo = contact.email || (process.env.QUOTE_NOTIFY_TO || '').split(',')[0].trim() || undefined;

  return sendMail({
    to: { name: String(quote.name || '').slice(0, 80), address: quote.email },
    ...(replyTo ? { replyTo } : {}),
    subject,
    html,
    text,
  });
}

/* ---------- Commercial offer sent to the customer (PDF attached) ---------- */

export async function buildOfferEmail(quote, offer, contact = {}) {
  // Shared with the admin offer document (kept free of imports)
  const { offerCopy, offerNumber, offerTotals, formatMoney, formatOfferDate } = await import('../../client/src/data/offerText.js');

  const lang = offer.language || 'tr';
  const copy = offerCopy(lang);
  const dir = copy.dir || 'ltr';
  const align = dir === 'rtl' ? 'right' : 'left';
  const end = dir === 'rtl' ? 'left' : 'right';
  const number = offerNumber(quote._id, offer.revision);
  const reference = quoteReference(quote._id);
  const totals = offerTotals(offer);
  const money = (value) => formatMoney(value, offer.currency, lang);
  const name = String(quote.name || '').slice(0, 80);
  const email = contact.email || DEFAULT_CONTACT.email;
  const phoneDisplay = contact.phoneDisplay || DEFAULT_CONTACT.phoneDisplay;

  const cell = (extra = '') => `padding:10px 12px;font-size:13px;border-top:1px solid #e2e7f2;vertical-align:top;${extra}`;

  const linesHtml = offer.lines
    .map((line, index) => `
                <tr>
                  <td style="${cell(`text-align:${align};color:#112244;`)}"><strong>${escapeHtml(line.name)}</strong>${line.details ? `<br><span style="color:#5d6980;font-size:12px;">${escapeHtml(line.details)}</span>` : ''}</td>
                  <td style="${cell(`text-align:${end};white-space:nowrap;color:#112244;`)}" dir="ltr">${escapeHtml(line.quantity)} ${escapeHtml(line.unit || copy.unit)}</td>
                  <td style="${cell(`text-align:${end};white-space:nowrap;color:#112244;font-weight:700;`)}" dir="ltr">${escapeHtml(money(totals.lines[index]))}</td>
                </tr>`)
    .join('');

  const totalRows = [
    ...(totals.hasVat ? [[copy.subtotal, money(totals.subtotal)], [`${copy.vat} (%${offer.vatRate})`, money(totals.vat)]] : []),
    [copy.total, money(totals.total)],
  ];

  const facts = [
    [copy.number, number],
    [copy.reference, reference],
    [copy.validUntil, formatOfferDate(offer.validUntil, lang)],
    [copy.incoterm, [offer.incoterm, offer.deliveryPlace].filter(Boolean).join(' – ')],
    [copy.deliveryTime, offer.deliveryTime],
    [copy.payment, offer.paymentTerms],
  ].filter(([, value]) => value);

  const subject = copy.emailSubject(number);

  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f3f8;font-family:Arial,Helvetica,sans-serif;color:#112244;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f3f8;padding:32px 12px;" dir="${dir}">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dadfe8;">
          <tr>
            <td style="background:#0f1e3c;padding:26px 32px;text-align:${align};">
              <div style="font-size:20px;font-weight:700;color:#ffffff;" dir="ltr">RMA <span style="color:#1d67d5;">Plastik</span></div>
              <p style="margin:20px 0 4px;font-size:12px;font-weight:700;color:#5b9cf5;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(copy.title)}</p>
              <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;" dir="ltr">${escapeHtml(number)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px 6px;text-align:${align};font-size:15px;line-height:1.7;">
              <p style="margin:0 0 10px;font-weight:700;">${escapeHtml(copy.emailGreeting(name))}</p>
              <p style="margin:0;">${escapeHtml(copy.emailIntro(reference))}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e7f2;border-radius:12px;border-collapse:separate;">
                <tr>
                  <td style="padding:10px 12px;font-size:11px;font-weight:700;color:#5d6980;text-transform:uppercase;text-align:${align};">${escapeHtml(copy.item)}</td>
                  <td style="padding:10px 12px;font-size:11px;font-weight:700;color:#5d6980;text-transform:uppercase;text-align:${end};">${escapeHtml(copy.qty)}</td>
                  <td style="padding:10px 12px;font-size:11px;font-weight:700;color:#5d6980;text-transform:uppercase;text-align:${end};">${escapeHtml(copy.amount)}</td>
                </tr>
                ${linesHtml}
                ${totalRows
                  .map(([label, value], index) => `
                <tr>
                  <td colspan="2" style="${cell(`text-align:${end};color:#5d6980;${index === totalRows.length - 1 ? 'font-weight:700;color:#112244;' : ''}`)}">${escapeHtml(label)}</td>
                  <td style="${cell(`text-align:${end};white-space:nowrap;${index === totalRows.length - 1 ? 'font-size:15px;font-weight:700;color:#1d67d5;' : 'color:#112244;'}`)}" dir="ltr">${escapeHtml(value)}</td>
                </tr>`)
                  .join('')}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${facts
                  .map(([label, value]) => `
                <tr>
                  <td style="padding:5px 0;width:40%;font-size:13px;color:#5d6980;text-align:${align};vertical-align:top;">${escapeHtml(label)}</td>
                  <td style="padding:5px 0;font-size:13px;color:#112244;font-weight:600;text-align:${align};vertical-align:top;">${escapeHtml(value)}</td>
                </tr>`)
                  .join('')}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;text-align:${align};font-size:14px;line-height:1.65;">
              <p style="margin:0 0 6px;">📎 ${escapeHtml(copy.emailAttachment)}</p>
              <p style="margin:0;">${escapeHtml(copy.emailReply)}</p>
              <p style="margin:16px 0 0;color:#5d6980;font-size:13px;">${escapeHtml(offer.preparedBy || 'RMA Plastik')}<br><span dir="ltr">${escapeHtml(phoneDisplay)}</span> · ${escapeHtml(email)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const plain = [
    copy.emailGreeting(name),
    '',
    copy.emailIntro(reference),
    '',
    ...offer.lines.map((line, index) => `- ${line.name}: ${line.quantity} ${line.unit || copy.unit} = ${money(totals.lines[index])}`),
    ...totalRows.map(([label, value]) => `${label}: ${value}`),
    '',
    ...facts.map(([label, value]) => `${label}: ${value}`),
    '',
    copy.emailAttachment,
    copy.emailReply,
    '',
    `${offer.preparedBy || 'RMA Plastik'} · ${phoneDisplay} · ${email}`,
  ].join('\n');

  return { subject, html, text: plain, name, number, total: money(totals.total) };
}

export async function sendOfferEmail(quote, offer, contact = {}, pdf) {
  const { subject, html, text, name, number, total } = await buildOfferEmail(quote, offer, contact);

  // Copy to the sales team so the sent offer is also in their inbox
  const sales = (process.env.QUOTE_NOTIFY_TO || '').split(',').map((item) => item.trim()).filter(Boolean);
  const replyTo = contact.email || sales[0] || undefined;

  await sendMail({
    to: { name, address: quote.email },
    ...(sales.length ? { bcc: sales } : {}),
    ...(replyTo ? { replyTo } : {}),
    subject,
    html,
    text,
    attachments: [{ filename: `${number}.pdf`, content: pdf, contentType: 'application/pdf' }],
  });

  return { number, total };
}
