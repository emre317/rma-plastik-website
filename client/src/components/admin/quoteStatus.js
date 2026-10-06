/* Quote request statuses (server: models/QuoteRequest.js) with Turkish labels */
export const QUOTE_STATUSES = [
  { id: 'new', label: 'Yeni', hint: 'Talep siteden yeni geldi.', tone: 'blue' },
  { id: 'reviewing', label: 'İnceleniyor', hint: 'Talep ve teknik ihtiyaçlar inceleniyor.', tone: 'amber' },
  { id: 'contacted', label: 'İletişime geçildi', hint: 'Müşteriyle görüşüldü.', tone: 'violet' },
  { id: 'quoted', label: 'Teklif verildi', hint: 'Ticari teklif hazırlanıp gönderildi.', tone: 'green' },
  { id: 'closed', label: 'Kapandı', hint: 'Süreç tamamlandı.', tone: 'gray' },
];

export const statusLabel = (id) => QUOTE_STATUSES.find((status) => status.id === id)?.label || id;
export const statusTone = (id) => QUOTE_STATUSES.find((status) => status.id === id)?.tone || 'gray';

export const LANGUAGE_LABELS = { tr: 'Türkçe', en: 'İngilizce', ar: 'Arapça' };

export function formatDate(value, withTime = false) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

/* "3 saat önce", "2 gün önce" */
export function timeAgo(value) {
  if (!value) return '';

  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });

  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
  if (Math.abs(minutes) < 1440) return rtf.format(-Math.round(minutes / 60), 'hour');
  if (Math.abs(minutes) < 43200) return rtf.format(-Math.round(minutes / 1440), 'day');
  return formatDate(value);
}
