import { MEETING_TOPIC_LABELS } from '../../data/meetingForm';

/* Meeting labels for the panel (server: models/Meeting.js) */

export const MEETING_STATUS = {
  pending: { label: 'Onay bekliyor', tone: 'amber' },
  confirmed: { label: 'Onaylandı', tone: 'green' },
  cancelled: { label: 'İptal', tone: 'gray' },
};

export const meetingStatusLabel = (meeting) => {
  if (meeting.status === 'confirmed' && new Date(meeting.startAt).getTime() + (meeting.durationMinutes || 60) * 60000 < Date.now()) return 'Gerçekleşti';
  return MEETING_STATUS[meeting.status]?.label || meeting.status;
};

export const meetingStatusTone = (meeting) => MEETING_STATUS[meeting.status]?.tone || 'gray';

export const MEETING_TYPE = { inPerson: 'Yüz yüze', online: 'Online (Teams)' };

export const meetingTopic = (meeting) => [MEETING_TOPIC_LABELS[meeting.topic] || meeting.topic, meeting.subject].filter(Boolean).join(' – ');

export const meetingReference = (id) => `TPL-${String(id || '').slice(-6).toUpperCase()}`;

const format = (value, options) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', ...options }).format(new Date(value));

export const meetingDay = (value) => format(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const meetingTime = (value) => format(value, { hour: '2-digit', minute: '2-digit' });
export const meetingWhen = (value) => `${meetingDay(value)} · ${meetingTime(value)}`;

/* "Bugün 14:00", "Yarın 10:30", "12 Kas Per 09:00" */
export function meetingShort(value) {
  const date = new Date(value);
  const key = (d) => format(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = key(new Date());
  const tomorrow = key(new Date(Date.now() + 86400000));
  const day = key(date);
  const time = meetingTime(date);
  if (day === today) return `Bugün ${time}`;
  if (day === tomorrow) return `Yarın ${time}`;
  return `${format(date, { day: 'numeric', month: 'short', weekday: 'short' })} ${time}`;
}

/* Minutes until it starts (negative: already started) */
export const minutesUntil = (value) => Math.round((new Date(value).getTime() - Date.now()) / 60000);
