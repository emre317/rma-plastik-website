/* Quote request statuses (server: models/QuoteRequest.js) with Turkish labels */
export const QUOTE_STATUSES = [
  { id: 'new', label: 'Yeni', hint: 'Talep siteden yeni geldi.', tone: 'blue' },
  { id: 'reviewing', label: 'İnceleniyor', hint: 'Talep ve teknik ihtiyaçlar inceleniyor.', tone: 'amber' },
  { id: 'contacted', label: 'İletişime Geçildi', hint: 'Müşteriyle görüşüldü.', tone: 'violet' },
  { id: 'quoted', label: 'Teklif Verildi', hint: 'Ticari teklif hazırlanıp gönderildi.', tone: 'green' },
  { id: 'closed', label: 'Kapandı', hint: 'Süreç tamamlandı.', tone: 'gray' },
];

/* Won / lost result of a closed request (server: models/QuoteRequest.js) */
export const QUOTE_OUTCOMES = [
  { id: 'won', label: 'Kazanıldı', tone: 'green' },
  { id: 'lost', label: 'Kaybedildi', tone: 'red' },
];

export const LOSS_REASONS = [
  { id: 'price', label: 'Fiyat' },
  { id: 'leadTime', label: 'Teslim Süresi' },
  { id: 'competitor', label: 'Rakibi Tercih Etti' },
  { id: 'noResponse', label: 'Yanıt Vermedi' },
  { id: 'specs', label: 'Ürün / Teknik Uymadı' },
  { id: 'postponed', label: 'Proje Ertelendi / İptal' },
  { id: 'other', label: 'Diğer' },
];

export const outcomeLabel = (id) => QUOTE_OUTCOMES.find((item) => item.id === id)?.label || '';
export const lossReasonLabel = (id) => LOSS_REASONS.find((item) => item.id === id)?.label || '';

/* Marketing channels (server: services/attribution.js) */
export const DIRECT_CHANNEL = 'Doğrudan';

export const statusLabel = (id) => QUOTE_STATUSES.find((status) => status.id === id)?.label || id;
export const statusTone = (id) => QUOTE_STATUSES.find((status) => status.id === id)?.tone || 'gray';

/* Reference shown to the customer and in emails (server: services/quoteEmail.js) */
export const quoteReference = (id) => `RMA-${String(id || '').slice(-6).toUpperCase()}`;

/* "2026-03-14" in Istanbul time, for <input type="date"> */
export function dayValue(value) {
  if (!value) return '';
  const date = new Date(new Date(value).getTime() + 3 * 3600 * 1000);
  return date.toISOString().slice(0, 10);
}

export const todayValue = () => dayValue(new Date());

/* Follow-up state: overdue, today or upcoming (closed requests have none) */
export function followUpState(quote) {
  if (!quote?.followUpAt || quote.status === 'closed') return '';
  const day = dayValue(quote.followUpAt);
  const today = todayValue();
  return day < today ? 'overdue' : day === today ? 'today' : 'upcoming';
}

export const LANGUAGE_LABELS = { tr: 'Türkçe', en: 'İngilizce', ar: 'Arapça' };

export function formatDate(value, withTime = false) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    // Business dates are Istanbul dates (follow-up days are stored as Istanbul midnight)
    timeZone: 'Europe/Istanbul',
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
