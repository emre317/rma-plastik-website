import { emailLogo, mailFrom, sendMail } from './mailer.js';
import { buildInvite, meetingUid } from './calendarInvite.js';
import Meeting from '../models/Meeting.js';
import { MEETING_TOPIC_LABELS, MEETING_TYPE_LABELS } from '../../client/src/data/meetingForm.js';

/*
  E-mails of the meeting requests:
    notification  new request -> MEETING_NOTIFY_TO (default info@rmaplastik.com)
    receipt       new request -> customer ("we received it", site language)
    customer      confirmed / updated / cancelled -> customer, online guests in Cc
    staff         confirmed / updated / cancelled -> the RMA staff who attend
  Confirmations and changes carry a calendar invitation (.ics) unless the
  meeting was made in Microsoft Teams (Microsoft sends the invitation then).
  Table-based HTML with inline styles, same look as the quote e-mails.
*/

export const meetingReference = (id) => `TPL-${String(id).slice(-6).toUpperCase()}`;

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function siteOrigin() {
  const origin = (process.env.CLIENT_URL || '').split(',').map((item) => item.trim()).filter(Boolean)[0];
  return origin ? origin.replace(/\/$/, '') : '';
}

const adminUrl = (id) => (siteOrigin() ? `${siteOrigin()}/admin/meetings/${id}` : '');

export const notifyAddress = () => process.env.MEETING_NOTIFY_TO || process.env.QUOTE_NOTIFY_TO || 'info@rmaplastik.com';

const mapsLink = (location) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

/* ---------- Texts ---------- */

const TEXT = {
  tr: {
    locale: 'tr-TR',
    timeZone: 'Türkiye saati (GMT+3)',
    minutes: (n) => `${n} dakika`,
    types: { inPerson: 'Yüz yüze görüşme', online: 'Online toplantı (Microsoft Teams)' },
    topics: MEETING_TOPIC_LABELS,
    receipt: {
      subject: (ref) => `Toplantı talebiniz alındı – ${ref}`,
      eyebrow: 'Talebiniz alındı',
      intro: 'Toplantı talebiniz ekibimize ulaştı. Uygunluğu kontrol edip toplantıyı onayladığımızda size ayrı bir e-posta ve takvim daveti göndereceğiz.',
    },
    confirmed: {
      subject: (ref) => `Toplantınız onaylandı – ${ref}`,
      eyebrow: 'Toplantı onaylandı',
      intro: 'Toplantı talebiniz onaylandı. Ayrıntılar aşağıdadır; ekteki davetle toplantıyı takviminize ekleyebilirsiniz.',
      rescheduled: 'Not: Toplantı saati, talep ettiğiniz saatten farklı olarak planlanmıştır.',
    },
    updated: {
      subject: (ref) => `Toplantınız güncellendi – ${ref}`,
      eyebrow: 'Toplantı güncellendi',
      intro: 'Toplantınızın bilgileri güncellendi. Güncel ayrıntılar aşağıdadır; takviminizdeki kayıt da güncellenecektir.',
    },
    cancelled: {
      subject: (ref) => `Toplantı iptal edildi – ${ref}`,
      eyebrow: 'Toplantı iptal edildi',
      intro: 'Toplantınız iptal edildi. Yeni bir zaman belirlemek isterseniz bu e-postayı yanıtlayabilir ya da sitemizden yeni bir talep gönderebilirsiniz.',
    },
    declined: {
      subject: (ref) => `Toplantı talebiniz hakkında – ${ref}`,
      eyebrow: 'Toplantı talebi',
      intro: 'Talep ettiğiniz toplantıyı bu kez planlayamadık. Başka bir zaman belirlemek için bu e-postayı yanıtlayabilir ya da sitemizden yeni bir talep gönderebilirsiniz.',
    },
    greeting: (name) => `Sayın ${name},`,
    labels: {
      reference: 'Referans', type: 'Toplantı türü', date: 'Tarih ve saat', requested: 'Talep edilen zaman', duration: 'Süre',
      topic: 'Konu', location: 'Yer', staff: 'RMA Plastik katılımcıları', guests: 'Katılımcılarınız', note: 'Ekibimizden not',
      company: 'Firma',
    },
    join: 'Teams toplantısına katıl',
    directions: 'Yol tarifi',
    joinHint: 'Toplantı saatinde yukarıdaki düğmeye tıklamanız yeterli; Teams uygulaması gerekmez, tarayıcıdan da katılabilirsiniz.',
    reply: 'Sorunuz olursa bu e-postayı yanıtlayabilirsiniz.',
    footer: 'Bu e-posta, web sitemizden gönderdiğiniz toplantı talebi nedeniyle gönderilmiştir.',
  },
  en: {
    locale: 'en-GB',
    timeZone: 'Türkiye time (GMT+3)',
    minutes: (n) => `${n} minutes`,
    types: { inPerson: 'Face-to-face meeting', online: 'Online meeting (Microsoft Teams)' },
    topics: {
      product: 'Product information', quote: 'Quotation / pricing', project: 'Custom manufacturing project',
      visit: 'Factory visit', partnership: 'Dealership / partnership', other: 'Other',
    },
    receipt: {
      subject: (ref) => `We have received your meeting request – ${ref}`,
      eyebrow: 'Request received',
      intro: 'Your meeting request has reached our team. Once we have checked availability and confirmed the meeting, we will send you a separate e-mail with a calendar invitation.',
    },
    confirmed: {
      subject: (ref) => `Your meeting is confirmed – ${ref}`,
      eyebrow: 'Meeting confirmed',
      intro: 'Your meeting request has been confirmed. The details are below; use the attached invitation to add it to your calendar.',
      rescheduled: 'Please note: the meeting has been scheduled at a different time from the one you requested.',
    },
    updated: {
      subject: (ref) => `Your meeting has been updated – ${ref}`,
      eyebrow: 'Meeting updated',
      intro: 'The details of your meeting have changed. The updated details are below; the entry in your calendar will be updated as well.',
    },
    cancelled: {
      subject: (ref) => `Meeting cancelled – ${ref}`,
      eyebrow: 'Meeting cancelled',
      intro: 'Your meeting has been cancelled. If you would like to find another time, simply reply to this e-mail or send a new request from our website.',
    },
    declined: {
      subject: (ref) => `About your meeting request – ${ref}`,
      eyebrow: 'Meeting request',
      intro: 'Unfortunately we could not schedule the meeting you requested. To find another time, simply reply to this e-mail or send a new request from our website.',
    },
    greeting: (name) => `Dear ${name},`,
    labels: {
      reference: 'Reference', type: 'Meeting type', date: 'Date and time', requested: 'Requested time', duration: 'Duration',
      topic: 'Subject', location: 'Location', staff: 'From RMA Plastik', guests: 'Your participants', note: 'Note from our team',
      company: 'Company',
    },
    join: 'Join the Teams meeting',
    directions: 'Directions',
    joinHint: 'At the meeting time, just click the button above. You do not need the Teams app; you can also join from your browser.',
    reply: 'If you have any questions, simply reply to this e-mail.',
    footer: 'You are receiving this e-mail because you sent a meeting request on our website.',
  },
  ar: {
    locale: 'ar',
    dir: 'rtl',
    timeZone: 'بتوقيت تركيا (GMT+3)',
    minutes: (n) => `${n} دقيقة`,
    types: { inPerson: 'اجتماع حضوري', online: 'اجتماع عبر الإنترنت (Microsoft Teams)' },
    topics: {
      product: 'معلومات عن المنتجات', quote: 'عرض سعر / تسعير', project: 'مشروع تصنيع حسب الطلب',
      visit: 'زيارة المصنع', partnership: 'وكالة / شراكة', other: 'أخرى',
    },
    receipt: {
      subject: (ref) => `تم استلام طلب الاجتماع – ${ref}`,
      eyebrow: 'تم استلام طلبك',
      intro: 'وصل طلب الاجتماع إلى فريقنا. بعد التحقق من التوفر وتأكيد الاجتماع سنرسل إليكم رسالة منفصلة مع دعوة تقويم.',
    },
    confirmed: {
      subject: (ref) => `تم تأكيد اجتماعكم – ${ref}`,
      eyebrow: 'تم تأكيد الاجتماع',
      intro: 'تم تأكيد طلب الاجتماع. التفاصيل أدناه، ويمكنكم إضافة الاجتماع إلى تقويمكم عبر الدعوة المرفقة.',
      rescheduled: 'ملاحظة: تم تحديد موعد الاجتماع في وقت مختلف عن الوقت الذي طلبتموه.',
    },
    updated: {
      subject: (ref) => `تم تحديث اجتماعكم – ${ref}`,
      eyebrow: 'تم تحديث الاجتماع',
      intro: 'تم تغيير تفاصيل اجتماعكم. التفاصيل المحدثة أدناه، وسيتم تحديث الموعد في تقويمكم أيضاً.',
    },
    cancelled: {
      subject: (ref) => `تم إلغاء الاجتماع – ${ref}`,
      eyebrow: 'تم إلغاء الاجتماع',
      intro: 'تم إلغاء اجتماعكم. إذا رغبتم في تحديد موعد آخر، يمكنكم الرد على هذه الرسالة أو إرسال طلب جديد من موقعنا.',
    },
    declined: {
      subject: (ref) => `بخصوص طلب الاجتماع – ${ref}`,
      eyebrow: 'طلب اجتماع',
      intro: 'للأسف لم نتمكن من تحديد الاجتماع الذي طلبتموه. لتحديد موعد آخر يمكنكم الرد على هذه الرسالة أو إرسال طلب جديد من موقعنا.',
    },
    greeting: (name) => `السيد/السيدة ${name}،`,
    labels: {
      reference: 'المرجع', type: 'نوع الاجتماع', date: 'التاريخ والوقت', requested: 'الوقت المطلوب', duration: 'المدة',
      topic: 'الموضوع', location: 'المكان', staff: 'من RMA Plastik', guests: 'المشاركون من طرفكم', note: 'ملاحظة من فريقنا',
      company: 'الشركة',
    },
    join: 'الانضمام إلى اجتماع Teams',
    directions: 'الاتجاهات',
    joinHint: 'في موعد الاجتماع يكفي الضغط على الزر أعلاه، ولا حاجة إلى تطبيق Teams إذ يمكن الانضمام من المتصفح.',
    reply: 'لأي استفسار يمكنكم الرد على هذه الرسالة.',
    footer: 'تم إرسال هذه الرسالة لأنكم أرسلتم طلب اجتماع عبر موقعنا.',
  },
};

const copyFor = (language) => TEXT[language] || TEXT.en;

export function formatWhen(date, locale = 'tr-TR') {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
  }).format(new Date(date));
}

const people = (list) => (list || []).map((person) => [person.name, person.title].filter(Boolean).join(' – ') || person.email).join(', ');

/* ---------- Layout ---------- */

function rowsTable(rows, align = 'left') {
  return rows
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .map(([label, value, href], index) => {
      const content = href ? `<a href="${esc(href)}" style="color:#e4173a;text-decoration:none;">${esc(value)}</a>` : esc(value);
      const border = index ? 'border-top:1px solid #e4e8ed;' : '';
      return `
                <tr>
                  <td style="padding:12px 16px;width:38%;font-size:13px;color:#5c6673;${border}vertical-align:top;text-align:${align};">${esc(label)}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#101317;font-weight:600;${border}vertical-align:top;text-align:${align};">${content}</td>
                </tr>`;
    })
    .join('');
}

function button(href, label, primary = true) {
  return `<td style="${primary ? 'background:#e4173a;' : 'border:1px solid #d5dae0;'}border-radius:10px;">
                    <a href="${esc(href)}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:${primary ? '#ffffff' : '#101317'};text-decoration:none;">${esc(label)}</a>
                  </td>`;
}

function layout({ lang = 'tr', dir = 'ltr', subject, preheader, eyebrow, title, subtitle, reference, sections, footer }) {
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f9fa;font-family:Arial,Helvetica,sans-serif;color:#101317;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fa;padding:32px 12px;" dir="${dir}">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d5dae0;">
          <tr>
            <td style="background:#101317;border-bottom:4px solid #e4173a;padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">${emailLogo()}</td>
                  <td align="${dir === 'rtl' ? 'left' : 'right'}" style="font-size:11px;font-weight:700;color:#818b98;letter-spacing:0.08em;text-transform:uppercase;" dir="ltr">${esc(reference)}</td>
                </tr>
              </table>
              <p style="margin:22px 0 6px;font-size:11px;font-weight:700;color:#e4173a;letter-spacing:0.08em;text-transform:uppercase;">${esc(eyebrow)}</p>
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;font-weight:600;">${esc(title)}</h1>
              ${subtitle ? `<p style="margin:6px 0 0;font-size:14px;color:#afb7c1;">${esc(subtitle)}</p>` : ''}
            </td>
          </tr>
${sections.filter(Boolean).join('\n')}
          <tr>
            <td style="padding:18px 32px;background:#f7f9fa;border-top:1px solid #e4e8ed;font-size:12px;line-height:1.6;color:#818b98;">${esc(footer)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const section = (inner, top = 28) => `
          <tr>
            <td style="padding:${top}px 32px 8px;">${inner}</td>
          </tr>`;

const label = (text) => `<p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#5c6673;letter-spacing:0.08em;text-transform:uppercase;">${esc(text)}</p>`;

const box = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e8ed;border-radius:12px;border-collapse:separate;">${rows}</table>`;

const paragraph = (text, align = 'left') => `<p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#101317;text-align:${align};">${esc(text)}</p>`;

const quoteBox = (text) => `<div style="padding:16px 18px;background:#f7f9fa;border-radius:12px;border-inline-start:3px solid #e4173a;font-size:14px;line-height:1.65;color:#101317;">${esc(text).replace(/\r?\n/g, '<br>')}</div>`;

const topicText = (meeting, labels = MEETING_TOPIC_LABELS) =>
  [labels[meeting.topic] || meeting.topic, meeting.subject].filter(Boolean).join(' – ');

/* ---------- Calendar invitation ---------- */

function inviteFor(meeting, method, attendees) {
  const isOnline = meeting.type === 'online';
  const summary = `RMA Plastik – ${meeting.company}${isOnline ? ' (Teams)' : ''}`;
  const description = [
    topicText(meeting),
    isOnline && meeting.joinUrl ? `Teams: ${meeting.joinUrl}` : '',
    `RMA Plastik: ${people(meeting.staff)}`,
    `${meeting.name} – ${meeting.company}`,
    meetingReference(meeting._id),
  ].filter(Boolean).join('\n');

  const content = buildInvite({
    method,
    uid: meetingUid(meeting._id),
    sequence: meeting.sequence || 0,
    start: meeting.startAt,
    durationMinutes: meeting.durationMinutes,
    summary,
    description,
    location: isOnline ? 'Microsoft Teams' : meeting.location,
    url: isOnline ? meeting.joinUrl : '',
    organizer: { name: 'RMA Plastik', email: mailFrom().address || notifyAddress().split(',')[0].trim() },
    attendees,
  });

  return { method, filename: method === 'CANCEL' ? 'cancel.ics' : 'invite.ics', content };
}

const allAttendees = (meeting) => [
  { name: meeting.name, email: meeting.email },
  ...(meeting.guests || []),
  ...(meeting.staff || []),
];

// Calendar invitations come from Microsoft when the meeting lives in Teams
const sendsOwnInvite = (meeting) => !meeting.teams?.eventId;

/* ---------- 1. New request -> info@ ---------- */

export function buildMeetingNotification(meeting) {
  const reference = meetingReference(meeting._id);
  const link = adminUrl(meeting._id);
  const when = formatWhen(meeting.requestedStartAt);
  const subject = `Yeni toplantı talebi (${MEETING_TYPE_LABELS[meeting.type]}): ${meeting.company} – ${when}`;

  const rows = [
    ['Toplantı türü', MEETING_TYPE_LABELS[meeting.type]],
    ['Talep edilen zaman', `${when} (Türkiye saati)`],
    ['Konu', topicText(meeting)],
    ['Firma', meeting.company],
    ['Yetkili', meeting.name],
    ['E-posta', meeting.email, `mailto:${meeting.email}`],
    ['Telefon', meeting.phone, meeting.phone ? `tel:${meeting.phone.replace(/[^\d+]/g, '')}` : ''],
    ['Ülke', meeting.country],
    ['Katılımcılar', (meeting.guests || []).map((guest) => `${guest.name ? `${guest.name} ` : ''}<${guest.email}>`).join(', ')],
    ['Site dili', { tr: 'Türkçe', en: 'İngilizce', ar: 'Arapça' }[meeting.language] || ''],
  ];

  const html = layout({
    subject,
    preheader: `${meeting.name} (${meeting.company}) ${when} için toplantı talep etti.`,
    eyebrow: `Yeni toplantı talebi · ${MEETING_TYPE_LABELS[meeting.type]}`,
    title: meeting.company,
    subtitle: when,
    reference,
    sections: [
      section(`${label('Talep bilgileri')}${box(rowsTable(rows))}`),
      meeting.message ? section(`${label('Mesaj')}${quoteBox(meeting.message)}`, 20) : '',
      section(`<table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  ${link ? button(link, 'Panelde onayla / revize et') : button(`mailto:${meeting.email}`, 'Müşteriye yanıt ver')}
                  ${link ? `<td style="width:10px;"></td>${button(`mailto:${meeting.email}?subject=${encodeURIComponent(`RMA Plastik toplantı talebiniz (${reference})`)}`, 'Müşteriye yanıt ver', false)}` : ''}
                </tr></table>`, 24),
    ],
    footer: `Bu e-posta web sitesindeki toplantı formundan otomatik gönderilmiştir. Toplantıyı onaylamak, saatini değiştirmek ve katılacak çalışanları seçmek için yönetim panelini kullanın. Yanıtla dediğinizde e-posta müşteriye (${meeting.email}) gider.`,
  });

  const text = [
    `YENİ TOPLANTI TALEBİ – ${reference}`,
    '',
    ...rows.filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`),
    '',
    meeting.message ? `Mesaj:\n${meeting.message}\n` : '',
    link ? `Yönetim paneli: ${link}` : '',
  ].filter((line) => line !== null).join('\n');

  return { subject, html, text };
}

export function sendMeetingNotification(meeting) {
  const { subject, html, text } = buildMeetingNotification(meeting);
  return sendMail({ to: notifyAddress(), replyTo: { name: meeting.name, address: meeting.email }, subject, html, text });
}

/* ---------- 2./3. Customer: receipt, confirmed, updated, cancelled, declined ---------- */

export function buildCustomerMeetingEmail(meeting, kind) {
  const lang = TEXT[meeting.language] ? meeting.language : 'en';
  const copy = copyFor(lang);
  const dir = copy.dir || 'ltr';
  const align = dir === 'rtl' ? 'right' : 'left';
  const texts = copy[kind];
  const reference = meetingReference(meeting._id);
  const isReceipt = kind === 'receipt';
  const isOff = kind === 'cancelled' || kind === 'declined';
  const isOnline = meeting.type === 'online';

  const startAt = isReceipt ? meeting.requestedStartAt : meeting.startAt;
  const when = `${formatWhen(startAt, copy.locale)} · ${copy.timeZone}`;
  const rescheduled = kind === 'confirmed' && meeting.requestedStartAt && new Date(meeting.requestedStartAt).getTime() !== new Date(meeting.startAt).getTime();

  const rows = [
    [copy.labels.type, copy.types[meeting.type]],
    [isReceipt ? copy.labels.requested : copy.labels.date, when],
    [copy.labels.duration, isReceipt || isOff ? '' : copy.minutes(meeting.durationMinutes)],
    [copy.labels.topic, topicText(meeting, copy.topics)],
    [copy.labels.company, meeting.company],
    [copy.labels.location, !isOnline && !isReceipt && !isOff ? meeting.location : '', !isOnline && meeting.location ? mapsLink(meeting.location) : ''],
    [copy.labels.staff, isReceipt || isOff ? '' : people(meeting.staff)],
    [copy.labels.guests, isOnline ? (meeting.guests || []).map((guest) => guest.name || guest.email).join(', ') : ''],
  ];

  const actions = [];
  if (!isReceipt && !isOff && isOnline && meeting.joinUrl) actions.push(button(meeting.joinUrl, copy.join));
  if (!isReceipt && !isOff && !isOnline && meeting.location) actions.push(button(mapsLink(meeting.location), copy.directions, !actions.length));

  const subject = texts.subject(reference);
  const html = layout({
    lang,
    dir,
    subject,
    preheader: texts.intro,
    eyebrow: texts.eyebrow,
    title: copy.types[meeting.type],
    subtitle: when,
    reference,
    sections: [
      section(`${paragraph(copy.greeting(String(meeting.name).slice(0, 80)), align)}${paragraph(texts.intro, align)}${rescheduled ? paragraph(texts.rescheduled, align) : ''}`),
      section(box(rowsTable(rows, align)), 12),
      meeting.customerNote && !isReceipt ? section(`${label(copy.labels.note)}${quoteBox(meeting.customerNote)}`, 20) : '',
      actions.length
        ? section(`<table role="presentation" cellpadding="0" cellspacing="0"><tr>${actions.join('<td style="width:10px;"></td>')}</tr></table>${isOnline ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#5c6673;text-align:${align};">${esc(copy.joinHint)}</p>` : ''}`, 20)
        : '',
      section(`<p style="margin:0 0 16px;font-size:13px;color:#5c6673;text-align:${align};">${esc(copy.reply)}</p>`, 16),
    ],
    footer: copy.footer,
  });

  const text = [
    `${texts.eyebrow} – ${reference}`,
    '',
    copy.greeting(meeting.name),
    texts.intro,
    rescheduled ? texts.rescheduled : '',
    '',
    ...rows.filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`),
    meeting.customerNote && !isReceipt ? `\n${copy.labels.note}: ${meeting.customerNote}` : '',
    !isReceipt && !isOff && isOnline && meeting.joinUrl ? `\n${copy.join}: ${meeting.joinUrl}` : '',
    '',
    copy.reply,
  ].join('\n');

  return { subject, html, text };
}

export function sendCustomerMeetingEmail(meeting, kind) {
  const { subject, html, text } = buildCustomerMeetingEmail(meeting, kind);
  const guests = meeting.type === 'online' && kind !== 'receipt' ? (meeting.guests || []).map((guest) => ({ name: guest.name, address: guest.email })) : [];
  const staff = (meeting.staff || []).filter((person) => person.email);

  // Invitation: confirmed / updated; removal: a cancelled meeting that had been confirmed
  let icalEvent;
  if (sendsOwnInvite(meeting) && (kind === 'confirmed' || kind === 'updated')) icalEvent = inviteFor(meeting, 'REQUEST', allAttendees(meeting));
  if (sendsOwnInvite(meeting) && kind === 'cancelled') icalEvent = inviteFor(meeting, 'CANCEL', allAttendees(meeting));

  return sendMail({
    to: { name: meeting.name, address: meeting.email },
    ...(guests.length ? { cc: guests } : {}),
    // Answers go to the attending staff (and info@), not to the no-reply sender
    replyTo: staff.length && kind !== 'receipt' ? staff.map((person) => ({ name: person.name, address: person.email })) : notifyAddress(),
    subject,
    html,
    text,
    ...(icalEvent ? { icalEvent } : {}),
  });
}

/* ---------- 4. Staff: confirmed, updated, cancelled ---------- */

const STAFF_TEXT = {
  confirmed: { subject: 'Toplantıya katılımcı olarak eklendiniz', eyebrow: 'Toplantı onaylandı' },
  updated: { subject: 'Toplantı güncellendi', eyebrow: 'Toplantı güncellendi' },
  cancelled: { subject: 'Toplantı iptal edildi', eyebrow: 'Toplantı iptal edildi' },
};

export function buildStaffMeetingEmail(meeting, kind) {
  const texts = STAFF_TEXT[kind];
  const reference = meetingReference(meeting._id);
  const link = adminUrl(meeting._id);
  const when = formatWhen(meeting.startAt);
  const isOnline = meeting.type === 'online';
  const subject = `${texts.subject}: ${meeting.company} – ${when}`;

  const rows = [
    ['Toplantı türü', MEETING_TYPE_LABELS[meeting.type]],
    ['Tarih ve saat', `${when} (Türkiye saati)`],
    ['Süre', `${meeting.durationMinutes} dakika`],
    ['Konu', topicText(meeting)],
    ['Yer', isOnline ? '' : meeting.location],
    ['Teams bağlantısı', isOnline ? meeting.joinUrl : '', isOnline ? meeting.joinUrl : ''],
    ['RMA katılımcıları', people(meeting.staff)],
    ['Firma', meeting.company],
    ['Müşteri', meeting.name],
    ['E-posta', meeting.email, `mailto:${meeting.email}`],
    ['Telefon', meeting.phone, meeting.phone ? `tel:${meeting.phone.replace(/[^\d+]/g, '')}` : ''],
    ['Ülke', meeting.country],
    ['Müşteri katılımcıları', (meeting.guests || []).map((guest) => `${guest.name ? `${guest.name} ` : ''}<${guest.email}>`).join(', ')],
  ];

  const actions = [];
  if (isOnline && meeting.joinUrl && kind !== 'cancelled') actions.push(button(meeting.joinUrl, 'Teams toplantısına katıl'));
  if (link) actions.push(button(link, 'Panelde aç', !actions.length));

  const html = layout({
    subject,
    preheader: `${when} · ${meeting.company}`,
    eyebrow: `${texts.eyebrow} · ${MEETING_TYPE_LABELS[meeting.type]}`,
    title: meeting.company,
    subtitle: when,
    reference,
    sections: [
      section(box(rowsTable(rows))),
      meeting.message ? section(`${label('Müşterinin mesajı')}${quoteBox(meeting.message)}`, 20) : '',
      meeting.internalNote ? section(`${label('İç not')}${quoteBox(meeting.internalNote)}`, 20) : '',
      actions.length ? section(`<table role="presentation" cellpadding="0" cellspacing="0"><tr>${actions.join('<td style="width:10px;"></td>')}</tr></table>`, 24) : '',
    ],
    footer: 'Bu e-posta, toplantı yönetim panelinde onaylandığı ya da değiştirildiği için gönderilmiştir. Ekteki davetle toplantı takviminize eklenir.',
  });

  const text = [
    `${texts.eyebrow.toUpperCase()} – ${reference}`,
    '',
    ...rows.filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`),
    meeting.message ? `\nMüşterinin mesajı:\n${meeting.message}` : '',
    meeting.internalNote ? `\nİç not:\n${meeting.internalNote}` : '',
    link ? `\nPanel: ${link}` : '',
  ].join('\n');

  return { subject, html, text };
}

export function sendStaffMeetingEmail(meeting, kind) {
  const staff = (meeting.staff || []).filter((person) => person.email);
  if (!staff.length) return Promise.resolve(null);

  const { subject, html, text } = buildStaffMeetingEmail(meeting, kind);
  let icalEvent;
  if (sendsOwnInvite(meeting)) icalEvent = inviteFor(meeting, kind === 'cancelled' ? 'CANCEL' : 'REQUEST', allAttendees(meeting));

  return sendMail({
    to: staff.map((person) => ({ name: person.name, address: person.email })),
    replyTo: { name: meeting.name, address: meeting.email },
    subject,
    html,
    text,
    ...(icalEvent ? { icalEvent } : {}),
  });
}

/* ---------- Delivery status on the meeting (shown in the panel) ---------- */

const cleanError = (message) =>
  String(message || 'Bilinmeyen hata').replace(/(auth|pass(word)?)[^\s]*\s*[:=]\s*\S+/gi, '$1=***').slice(0, 300);

export async function trackMeetingMail(meetingId, kind, send) {
  let entry;

  try {
    const result = await send();
    entry = { status: result ? 'sent' : 'skipped', at: new Date(), error: result ? '' : 'SMTP ya da alıcı adresi ayarlı değil.' };
  } catch (error) {
    console.error(`Meeting ${kind} email error:`, error.message);
    entry = { status: 'failed', at: new Date(), error: cleanError(error.message) };
  }

  try {
    const meeting = await Meeting.findById(meetingId).select('mail').lean();
    const attempts = (meeting?.mail?.[kind]?.attempts || 0) + 1;
    await Meeting.updateOne({ _id: meetingId }, { $set: { [`mail.${kind}`]: { ...entry, attempts } } });
  } catch (error) {
    console.error(`Meeting ${kind} email status could not be saved:`, error.message);
  }

  return entry;
}
